export type GameStatus = "active" | "coming_soon";

export interface GameConfig {
  id: string;
  title: string;
  titleAr: string;
  route: string;
  externalUrl: string;
  status: GameStatus;
  description?: string;
  descriptionAr?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// GAME LAUNCHER CONFIG
//
// externalUrl: full https:// URL for games hosted on a separate domain.
//   Leave "" for games served as internal routes on this same domain.
//   Internal routes use the `route` field for navigation (e.g. /flash).
// ─────────────────────────────────────────────────────────────────────────────
export const GAMES_CONFIG: GameConfig[] = [
  {
    id: "tfadhloon",
    title: "Tfadhloon",
    titleAr: "تفضلون",
    route: "/tfadhloon",
    externalUrl: "https://www.tfadhloon.com",
    status: "active",
    description: "The ultimate party icebreaker — vote, reveal, chaos.",
    descriptionAr: "لعبة الحفلات المثالية — صوّت، اكشف، فوضى.",
  },
  {
    id: "aljasoos",
    title: "Aljasoos",
    titleAr: "الجاسوس",
    route: "/aljasoos",
    externalUrl: "",
    status: "active",
    description: "Find the spy before they find you.",
    descriptionAr: "اكشف الجاسوس قبل أن يكشفك.",
  },
  {
    id: "flash",
    title: "Flash",
    titleAr: "فلاش",
    route: "/flash",
    externalUrl: "",
    status: "active",
    description: "Lightning fast party game.",
    descriptionAr: "لعبة حفلات سريعة البرق.",
  },
  {
    id: "yesno",
    title: "Yes / No",
    titleAr: "نعم / لا",
    route: "/yesno",
    externalUrl: "",
    status: "active",
    description: "One question. Two answers. Infinite awkwardness.",
    descriptionAr: "سؤال واحد. إجابتان. إحراج لا نهاية له.",
  },
  {
    id: "bomb",
    title: "Bomb",
    titleAr: "القنبلة",
    route: "/bomb",
    externalUrl: "",
    status: "active",
    description: "Pass the bomb before it explodes. Categories. Speed.",
    descriptionAr: "مرر القنبلة قبل أن تنفجر. فئات. سرعة.",
  },
  {
    id: "reactor",
    title: "Reactor",
    titleAr: "المفاعل",
    route: "/reactor",
    externalUrl: "",
    status: "active",
    description: "React fast or face the consequences.",
    descriptionAr: "تصرف بسرعة أو تواجه العواقب.",
  },
  {
    id: "forehead",
    title: "Forehead",
    titleAr: "الجبهة",
    route: "/forehead",
    externalUrl: "https://forehead-game.replit.app/forehead",
    status: "active",
    description: "Who am I? Hold it to your forehead and find out.",
    descriptionAr: "من أنا؟ ضعها على جبهتك واكتشف.",
  },
  {
    id: "guessthecharacter",
    title: "Guess the Character",
    titleAr: "خمّن الشخصية",
    route: "/guessthecharacter",
    externalUrl: "https://forehead-game.replit.app/character",
    status: "active",
    description: "Famous faces, mystery rounds.",
    descriptionAr: "وجوه مشهورة، جولات غامضة.",
  },
  {
    id: "charades",
    title: "Charades",
    titleAr: "الشرادة",
    route: "/charades",
    externalUrl: "https://forehead-game.replit.app/charades",
    status: "active",
    description: "Act it out. No words allowed.",
    descriptionAr: "مثّلها. لا كلمات مسموحة.",
  },
];

export function getGameByRoute(route: string): GameConfig | undefined {
  return GAMES_CONFIG.find((g) => g.route === route);
}

export function getGameById(id: string): GameConfig | undefined {
  return GAMES_CONFIG.find((g) => g.id === id);
}
