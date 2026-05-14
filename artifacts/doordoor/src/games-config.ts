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
// Replace the externalUrl values with your actual Replit game URLs.
// Each URL should be the full address, e.g. https://my-game.replit.app
// ─────────────────────────────────────────────────────────────────────────────
export const GAMES_CONFIG: GameConfig[] = [
  {
    id: "flash",
    title: "Flash",
    titleAr: "فلاش",
    route: "/flash",
    externalUrl: "PASTE_URL_HERE",
    status: "active",
    description: "Lightning fast party game.",
    descriptionAr: "لعبة حفلات سريعة البرق.",
  },
  {
    id: "yesno",
    title: "Yes / No",
    titleAr: "نعم / لا",
    route: "/yesno",
    externalUrl: "PASTE_URL_HERE",
    status: "active",
    description: "One question. Two answers. Infinite awkwardness.",
    descriptionAr: "سؤال واحد. إجابتان. إحراج لا نهاية له.",
  },
  {
    id: "bomb",
    title: "Bomb",
    titleAr: "القنبلة",
    route: "/bomb",
    externalUrl: "PASTE_URL_HERE",
    status: "active",
    description: "Pass the bomb before it explodes. Categories. Speed.",
    descriptionAr: "مرر القنبلة قبل أن تنفجر. فئات. سرعة.",
  },
  {
    id: "bomb2mobile",
    title: "Bomb 2 Mobile",
    titleAr: "القنبلة 2 موبايل",
    route: "/bomb2mobile",
    externalUrl: "PASTE_URL_HERE",
    status: "active",
    description: "Mobile-optimized bomb round.",
    descriptionAr: "جولة القنبلة للجوال.",
  },
  {
    id: "forehead",
    title: "Forehead",
    titleAr: "الجبهة",
    route: "/forehead",
    externalUrl: "PASTE_URL_HERE",
    status: "active",
    description: "Who am I? Hold it to your forehead and find out.",
    descriptionAr: "من أنا؟ ضعها على جبهتك واكتشف.",
  },
  {
    id: "charades",
    title: "Charades",
    titleAr: "الشرادة",
    route: "/charades",
    externalUrl: "PASTE_URL_HERE",
    status: "active",
    description: "Act it out. No words allowed.",
    descriptionAr: "مثّلها. لا كلمات مسموحة.",
  },
  {
    id: "guessthecharacter",
    title: "Guess the Character",
    titleAr: "خمّن الشخصية",
    route: "/guessthecharacter",
    externalUrl: "PASTE_URL_HERE",
    status: "active",
    description: "Famous faces, mystery rounds.",
    descriptionAr: "وجوه مشهورة، جولات غامضة.",
  },
  {
    id: "tfadhloon",
    title: "Tfadhloon",
    titleAr: "تفضلون",
    route: "/tfadhloon",
    externalUrl: "PASTE_URL_HERE",
    status: "active",
    description: "The ultimate party icebreaker — vote, reveal, chaos.",
    descriptionAr: "لعبة الحفلات المثالية — صوّت، اكشف، فوضى.",
  },
];

export function getGameByRoute(route: string): GameConfig | undefined {
  return GAMES_CONFIG.find((g) => g.route === route);
}

export function getGameById(id: string): GameConfig | undefined {
  return GAMES_CONFIG.find((g) => g.id === id);
}
