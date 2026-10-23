import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  options: "-c search_path=forehead,public",
  max: Number(process.env.DB_POOL_MAX ?? 10),
  connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS ?? 10_000),
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS ?? 30_000),
  keepAlive: true,
});
export const db = drizzle(pool, { schema });

pool.on("error", (error) => {
  console.error(
    "[database] unexpected idle client error",
    formatDatabaseError(error),
  );
});

export function formatDatabaseError(error: unknown) {
  if (!(error instanceof Error)) return { message: String(error) };
  const pgError = error as Error & {
    code?: string;
    detail?: string;
    hint?: string;
  };
  return {
    name: pgError.name,
    message: pgError.message,
    code: pgError.code,
    detail: pgError.detail,
    hint: pgError.hint,
  };
}

export async function ensureDatabaseSchema(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("CREATE SCHEMA IF NOT EXISTS forehead");
    await client.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
    await client.query("SET LOCAL search_path TO forehead, public");
    await client.query("SELECT pg_advisory_xact_lock(1179864656)");
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL DEFAULT 'text',
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS category_items (
        id SERIAL PRIMARY KEY,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        item_text TEXT NOT NULL,
        image_url TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS characters (
        id SERIAL PRIMARY KEY,
        answer TEXT NOT NULL,
        hints TEXT[] NOT NULL,
        lang TEXT NOT NULL DEFAULT 'en',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS charades (
        id SERIAL PRIMARY KEY,
        answer TEXT NOT NULL,
        lang TEXT NOT NULL DEFAULT 'en',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'waiting',
        mode TEXT NOT NULL DEFAULT 'forehead',
        lang TEXT NOT NULL DEFAULT 'en',
        category_id INTEGER REFERENCES categories(id),
        turn_duration INTEGER NOT NULL DEFAULT 60,
        round_count INTEGER NOT NULL DEFAULT 1,
        current_turn_player_id INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS players (
        id SERIAL PRIMARY KEY,
        room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        is_host BOOLEAN NOT NULL DEFAULT FALSE,
        score INTEGER NOT NULL DEFAULT 0,
        connected BOOLEAN NOT NULL DEFAULT TRUE,
        session_token TEXT,
        joined_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS turns (
        id SERIAL PRIMARY KEY,
        room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        player_id INTEGER NOT NULL REFERENCES players(id),
        item_id INTEGER,
        item_text TEXT,
        image_url TEXT,
        result TEXT,
        started_at TIMESTAMP NOT NULL DEFAULT NOW(),
        ended_at TIMESTAMP,
        turn_number INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS public.participants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS participants_email_key
        ON public.participants (LOWER(email));
      CREATE UNIQUE INDEX IF NOT EXISTS participants_phone_key
        ON public.participants (phone);

      CREATE TABLE IF NOT EXISTS public.hosts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
        trial_used BOOLEAN NOT NULL DEFAULT FALSE,
        remaining_minutes INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS hosts_email_key ON public.hosts (LOWER(email));
      CREATE UNIQUE INDEX IF NOT EXISTS hosts_phone_key ON public.hosts (phone);

      CREATE TABLE IF NOT EXISTS public.pending_registrations (
        phone TEXT PRIMARY KEY,
        role TEXT NOT NULL CHECK (role IN ('host', 'participant')),
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.auth_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id UUID NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('host', 'participant')),
        refresh_token_hash TEXT NOT NULL UNIQUE,
        user_agent TEXT,
        expires_at TIMESTAMPTZ NOT NULL,
        revoked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS auth_sessions_account_idx
        ON public.auth_sessions (account_id, role);
      CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx
        ON public.auth_sessions (expires_at);

      CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
        key_hash TEXT PRIMARY KEY,
        attempts INTEGER NOT NULL,
        reset_at TIMESTAMPTZ NOT NULL
      );
    `);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export * from "./schema";
