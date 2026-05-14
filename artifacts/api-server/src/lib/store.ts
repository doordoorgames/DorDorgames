import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "../../data");

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
      return readJson<Game[]>("games.json", getDefaultGames());
    },
    get(id: string): Game | undefined {
      return this.list().find((g) => g.id === id);
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
      const games = this.list();
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
      return readJson<Room[]>("rooms.json", []).find(
        (r) => r.code === code && r.open,
      );
    },
    create(hostPhone: string, gameId: string): Room {
      const rooms = readJson<Room[]>("rooms.json", []);
      const code = generateRoomCode();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 3 * 60 * 60 * 1000);
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
      createdAt: new Date().toISOString(),
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
      createdAt: new Date().toISOString(),
    },
    {
      id: "game_yesno",
      slug: "yesno",
      title: "Yes/No",
      titleAr: "نعم/لا",
      description: "One question. Two answers. Infinite awkwardness.",
      descriptionAr: "سؤال واحد. إجابتان. إحراج لا نهاية له.",
      logoUrl: null,
      status: "active",
      visible: true,
      pricingText: "2 KD / 3 hours",
      route: "/yesno",
      createdAt: new Date().toISOString(),
    },
    {
      id: "game_mystery",
      slug: "mystery",
      title: "Mystery Mode",
      titleAr: "وضع الغموض",
      description: "Something new is coming to the arcade.",
      descriptionAr: "شيء جديد قادم إلى الأركيد.",
      logoUrl: null,
      status: "coming_soon",
      visible: true,
      pricingText: null,
      route: null,
      createdAt: new Date().toISOString(),
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
