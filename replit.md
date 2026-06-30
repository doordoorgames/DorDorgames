# DoorDoor.games

A dystopian 90s anime underground arcade gaming platform — mobile-first, portrait-optimized party gaming network with host/guest rooms, a bilingual UI, and a modular game architecture.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/doordoor run dev` — run the frontend (port 20948)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Wouter + Framer Motion + TailwindCSS
- API: Express 5 (artifacts/api-server)
- Storage: JSON file storage (artifacts/api-server/data/) — no database needed
- Validation: Zod (`zod/v4`), generated from OpenAPI via Orval
- API codegen: Orval (from OpenAPI spec)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/api-zod/src/generated/` — generated Zod schemas for the server
- `artifacts/doordoor/src/` — React frontend
- `artifacts/doordoor/src/pages/` — all pages (homepage, host, admin, join, room)
- `artifacts/api-server/src/routes/` — Express routes (games, rooms, hosts, checkout, admin)
- `artifacts/api-server/src/lib/store.ts` — JSON file storage layer
- `artifacts/api-server/data/` — runtime JSON data files (gitignored in production)

## Architecture decisions

- No database — lightweight JSON file storage as specified (future-ready for DB swap via the store abstraction)
- OTP uses Twilio Verify (real SMS, 6-digit codes) — requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID secrets
- Payment is simulated — ready for MyFatoorah/Tap integration
- Promo code `DOORDOOR` is always valid and grants a free 3-hour pass
- Admin credentials: username `admin`, password `admin999`
- Rooms are 3-hour disposable sessions; switching games inside a lobby preserves all guests

## Product

- **Homepage** (`/`): Arcade cartridge grid of all games, bilingual Arabic + English, Coming Soon states
- **Guest join** (`/join`, `/join/:code`): Nickname-only, no registration required
- **Host flow** (`/host`): Name/email/phone/password → Twilio SMS OTP → dashboard with QR code
- **Host dashboard** (`/host/dashboard`): Active room, QR code, guest list, live game switching
- **Guest room view** (`/room/:code`): Shows active game, room code, guest list
- **Admin panel** (`/admin`, `/admin/dashboard`): Games management, rooms, promo codes

## User preferences

- Mobile-first, portrait-optimized — primary target is phone screens
- Bilingual: Arabic (RTL) + English
- Aesthetic: 90s anime + cyber arcade + dystopian — neon magenta, purple, acid green, teal, black
- No database for now — JSON file storage is intentional
- No Firebase, no Supabase, no complex auth

## Gotchas

- After any OpenAPI spec change, always run codegen before using updated types
- The admin token is a static string (`doordoor-admin-token-2024`) — not secure for production
- Host sessions are stored in memory (Map) — they reset on server restart
- The `data/` directory is created automatically on first run

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Game routes (e.g. `/tfadhloon`, `/bomb`, `/yesno`) are modular — add them as separate artifacts
