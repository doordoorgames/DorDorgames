import fs from "fs";
import path from "path";

// NOTE: do not derive this from import.meta.url / __dirname. The production
// build bundles the whole server into a single flat dist/index.mjs, which
// collapses the src/lib nesting and makes any "../../data" relative path
// resolve one directory too high (artifacts/data instead of
// artifacts/api-server/data). process.cwd() is stable across dev (tsx) and
// the built bundle, since both are always launched from the package root.
const DATA_DIR = path.join(process.cwd(), "data");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJson<T>(filename: string, defaultValue: T): T {
  ensureDataDir();
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) {
    return defaultValue;
  }
  try {
    return JSON.parse(fs.readFileSync(filepath, "utf-8")) as T;
  } catch {
    return defaultValue;
  }
}

function writeJson<T>(filename: string, data: T): void {
  ensureDataDir();
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), "utf-8");
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export type GameStatus = "active" | "coming_soon";

export interface Game {
  id: string;
  slug: string;
  title: string;
  titleAr: string;
  description: string | null;
  descriptionAr: string | null;
  logoUrl: string | null;
  status: GameStatus;
  visible: boolean;
  pricingText: string | null;
  route: string | null;
  externalUrl: string | null;
  createdAt: string;
}

export interface Room {
  id: string;
  code: string;
  hostPhone: string;
  activeGameId: string;
  guests: string[];
  createdAt: string;
  expiresAt: string;
  open: boolean;
}

export interface Host {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  passwordHash: string;
  phoneVerified: boolean;
  trialUsed: boolean;
  remainingMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface PromoCode {
  id: string;
  code: string;
  active: boolean;
  usageCount: number;
  createdAt: string;
}

const BUILT_IN_PROMO_CODES = ["DOORDOOR"];

export const store = {
  games: {
    list(): Game[] {
      const games = readJson<Game[]>("games.json", getDefaultGames());
      return games.map((g) => ({ ...g, externalUrl: g.externalUrl ?? null }));
    },
    get(id: string): Game | undefined {
      return this.list().find((g) => g.id === id);
    },
    getBySlug(slug: string): Game | undefined {
      return this.list().find((g) => g.slug === slug);
    },
    create(input: Omit<Game, "id" | "createdAt">): Game {
      const games = this.list();
      const game: Game = {
        ...input,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      games.push(game);
      writeJson("games.json", games);
      return game;
    },
    update(id: string, updates: Partial<Omit<Game, "id" | "createdAt">>): Game | undefined {
      const games = readJson<Game[]>("games.json", getDefaultGames()).map(
        (g) => ({ ...g, externalUrl: g.externalUrl ?? null }),
      );
      const idx = games.findIndex((g) => g.id === id);
      if (idx === -1) return undefined;
      games[idx] = { ...games[idx], ...updates };
      writeJson("games.json", games);
      return games[idx];
    },
    delete(id: string): boolean {
      const games = this.list();
      const filtered = games.filter((g) => g.id !== id);
      if (filtered.length === games.length) return false;
      writeJson("games.json", filtered);
      return true;
    },
  },

  rooms: {
    list(): Room[] {
      const rooms = readJson<Room[]>("rooms.json", []);
      const now = new Date().toISOString();
      return rooms.filter((r) => r.open && r.expiresAt > now);
    },
    listAll(): Room[] {
      return readJson<Room[]>("rooms.json", []);
    },
    get(code: string): Room | undefined {
      const now = new Date().toISOString();
      return readJson<Room[]>("rooms.json", []).find(
        (r) => r.code === code && r.open && r.expiresAt > now,
      );
    },
    closeExpired(): number {
      const rooms = readJson<Room[]>("rooms.json", []);
      const now = new Date().toISOString();
      let count = 0;
      for (const room of rooms) {
        if (room.open && room.expiresAt <= now) {
          room.open = false;
          count++;
        }
      }
      if (count > 0) {
        writeJson("rooms.json", rooms);
      }
      return count;
    },
    create(hostPhone: string, gameId: string, durationMinutes: number = 180): Room {
      const rooms = readJson<Room[]>("rooms.json", []);
      const code = generateRoomCode();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);
      const room: Room = {
        id: generateId(),
        code,
        hostPhone,
        activeGameId: gameId,
        guests: [],
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        open: true,
      };
      rooms.push(room);
      writeJson("rooms.json", rooms);
      return room;
    },
    update(code: string, updates: Partial<Omit<Room, "id" | "code" | "createdAt">>): Room | undefined {
      const rooms = readJson<Room[]>("rooms.json", []);
      const idx = rooms.findIndex((r) => r.code === code);
      if (idx === -1) return undefined;
      rooms[idx] = { ...rooms[idx], ...updates };
      writeJson("rooms.json", rooms);
      return rooms[idx];
    },
    close(code: string): boolean {
      const rooms = readJson<Room[]>("rooms.json", []);
      const idx = rooms.findIndex((r) => r.code === code);
      if (idx === -1) return false;
      rooms[idx].open = false;
      writeJson("rooms.json", rooms);
      return true;
    },
    addGuest(code: string, nickname: string): Room | undefined {
      const rooms = readJson<Room[]>("rooms.json", []);
      const idx = rooms.findIndex((r) => r.code === code && r.open);
      if (idx === -1) return undefined;
      if (!rooms[idx].guests.includes(nickname)) {
        rooms[idx].guests.push(nickname);
      }
      writeJson("rooms.json", rooms);
      return rooms[idx];
    },
  },

  hosts: {
    list(): Host[] {
      return readJson<Host[]>("hosts.json", []);
    },
    get(id: string): Host | undefined {
      return this.list().find((h) => h.id === id);
    },
    getByPhone(phone: string): Host | undefined {
      return this.list().find((h) => h.phone === phone);
    },
    getByEmail(email: string): Host | undefined {
      return this.list().find(
        (h) => h.email.toLowerCase() === email.toLowerCase(),
      );
    },
    getByIdentifier(identifier: string): Host | undefined {
      const lower = identifier.toLowerCase();
      return this.list().find(
        (h) => h.email.toLowerCase() === lower || h.phone === identifier,
      );
    },
    create(input: Omit<Host, "id" | "createdAt" | "updatedAt">): Host {
      const hosts = this.list();
      const now = new Date().toISOString();
      const host: Host = {
        ...input,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      };
      hosts.push(host);
      writeJson("hosts.json", hosts);
      return host;
    },
    update(
      id: string,
      updates: Partial<Omit<Host, "id" | "createdAt">>,
    ): Host | undefined {
      const hosts = readJson<Host[]>("hosts.json", []);
      const idx = hosts.findIndex((h) => h.id === id);
      if (idx === -1) return undefined;
      hosts[idx] = {
        ...hosts[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      writeJson("hosts.json", hosts);
      return hosts[idx];
    },
    deductTime(id: string, minutes: number): Host | undefined {
      const hosts = readJson<Host[]>("hosts.json", []);
      const idx = hosts.findIndex((h) => h.id === id);
      if (idx === -1) return undefined;
      hosts[idx].remainingMinutes = Math.max(
        0,
        hosts[idx].remainingMinutes - minutes,
      );
      hosts[idx].updatedAt = new Date().toISOString();
      writeJson("hosts.json", hosts);
      return hosts[idx];
    },
    addTime(id: string, minutes: number): Host | undefined {
      const hosts = readJson<Host[]>("hosts.json", []);
      const idx = hosts.findIndex((h) => h.id === id);
      if (idx === -1) return undefined;
      hosts[idx].remainingMinutes += minutes;
      hosts[idx].updatedAt = new Date().toISOString();
      writeJson("hosts.json", hosts);
      return hosts[idx];
    },
  },

  promoCodes: {
    list(): PromoCode[] {
      return readJson<PromoCode[]>("promo_codes.json", getDefaultPromoCodes());
    },
    get(code: string): PromoCode | undefined {
      return this.list().find(
        (p) => p.code.toUpperCase() === code.toUpperCase(),
      );
    },
    create(input: { code: string; active?: boolean }): PromoCode {
      const codes = this.list();
      const pc: PromoCode = {
        id: generateId(),
        code: input.code.toUpperCase(),
        active: input.active ?? true,
        usageCount: 0,
        createdAt: new Date().toISOString(),
      };
      codes.push(pc);
      writeJson("promo_codes.json", codes);
      return pc;
    },
    delete(code: string): boolean {
      const codes = this.list();
      const filtered = codes.filter(
        (p) => p.code.toUpperCase() !== code.toUpperCase(),
      );
      if (filtered.length === codes.length) return false;
      writeJson("promo_codes.json", filtered);
      return true;
    },
    incrementUsage(code: string): void {
      const codes = readJson<PromoCode[]>("promo_codes.json", getDefaultPromoCodes());
      const idx = codes.findIndex(
        (p) => p.code.toUpperCase() === code.toUpperCase(),
      );
      if (idx !== -1) {
        codes[idx].usageCount = (codes[idx].usageCount ?? 0) + 1;
        writeJson("promo_codes.json", codes);
      }
    },
  },

  isValidBuiltInPromo(code: string): boolean {
    return BUILT_IN_PROMO_CODES.includes(code.toUpperCase());
  },
};

function getDefaultGames(): Game[] {
  const now = new Date().toISOString();
  return [
    {
      id: "game_tfadhloon",
      slug: "tfadhloon",
      title: "Tfadhloon",
      titleAr: "تفضلون",
      description: "The ultimate party icebreaker — vote, reveal, chaos.",
      descriptionAr: "لعبة الحفلات المثالية — صوّت، اكشف، فوضى.",
      logoUrl: null,
      status: "active",
      visible: true,
      pricingText: "2 KD / 3 hours",
      route: "/tfadhloon",
      externalUrl: null,
      createdAt: now,
    },
    {
      id: "game_aljasoos",
      slug: "aljasoos",
      title: "Aljasoos",
      titleAr: "الجاسوس",
      description: "Find the spy before they find you.",
      descriptionAr: "اكشف الجاسوس قبل أن يكشفك.",
      logoUrl: null,
      status: "active",
      visible: true,
      pricingText: "2 KD / 3 hours",
      route: "/aljasoos",
      externalUrl: null,
      createdAt: now,
    },
    {
      id: "game_flash",
      slug: "flash",
      title: "Flash",
      titleAr: "فلاش",
      description: "Lightning fast party game.",
      descriptionAr: "لعبة حفلات سريعة البرق.",
      logoUrl: null,
      status: "active",
      visible: true,
      pricingText: "2 KD / 3 hours",
      route: "/flash",
      externalUrl: null,
      createdAt: now,
    },
    {
      id: "game_yesno",
      slug: "yesno",
      title: "Yes / No",
      titleAr: "نعم / لا",
      description: "One question. Two answers. Infinite awkwardness.",
      descriptionAr: "سؤال واحد. إجابتان. إحراج لا نهاية له.",
      logoUrl: null,
      status: "active",
      visible: true,
      pricingText: "2 KD / 3 hours",
      route: "/yesno",
      externalUrl: null,
      createdAt: now,
    },
    {
      id: "game_bomb",
      slug: "bomb",
      title: "Bomb",
      titleAr: "القنبلة",
      description: "Pass the bomb before it explodes. Categories. Speed.",
      descriptionAr: "مرر القنبلة قبل أن تنفجر. فئات. سرعة.",
      logoUrl: null,
      status: "active",
      visible: true,
      pricingText: "2 KD / 3 hours",
      route: "/bomb",
      externalUrl: null,
      createdAt: now,
    },
    {
      id: "game_reactor",
      slug: "reactor",
      title: "Reactor",
      titleAr: "المفاعل",
      description: "React fast or face the consequences.",
      descriptionAr: "تصرف بسرعة أو تواجه العواقب.",
      logoUrl: null,
      status: "active",
      visible: true,
      pricingText: "2 KD / 3 hours",
      route: "/reactor",
      externalUrl: null,
      createdAt: now,
    },
    {
      id: "game_forehead",
      slug: "forehead",
      title: "Forehead",
      titleAr: "الجبهة",
      description: "Who am I? Hold it to your forehead and find out.",
      descriptionAr: "من أنا؟ ضعها على جبهتك واكتشف.",
      logoUrl: null,
      status: "active",
      visible: true,
      pricingText: "2 KD / 3 hours",
      route: "/forehead",
      externalUrl: "https://forehead-game.replit.app/forehead",
      createdAt: now,
    },
    {
      id: "game_guessthecharacter",
      slug: "guessthecharacter",
      title: "Guess the Character",
      titleAr: "خمّن الشخصية",
      description: "Famous faces, mystery rounds.",
      descriptionAr: "وجوه مشهورة، جولات غامضة.",
      logoUrl: null,
      status: "active",
      visible: true,
      pricingText: "2 KD / 3 hours",
      route: "/guessthecharacter",
      externalUrl: "https://forehead-game.replit.app/character",
      createdAt: now,
    },
    {
      id: "game_charades",
      slug: "charades",
      title: "Charades",
      titleAr: "الشرادة",
      description: "Act it out. No words allowed.",
      descriptionAr: "مثّلها. لا كلمات مسموحة.",
      logoUrl: null,
      status: "active",
      visible: true,
      pricingText: "2 KD / 3 hours",
      route: "/charades",
      externalUrl: "https://forehead-game.replit.app/charades",
      createdAt: now,
    },
  ];
}

function getDefaultPromoCodes(): PromoCode[] {
  return [
    {
      id: "promo_doordoor",
      code: "DOORDOOR",
      active: true,
      usageCount: 0,
      createdAt: new Date().toISOString(),
    },
  ];
}
