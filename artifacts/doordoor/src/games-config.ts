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
// Fill in each externalUrl with the full Replit URL for that game.
// Example: "https://my-game.replit.app"
// Leave blank ("") to show "url pending" on the card until the URL is ready.
// ─────────────────────────────────────────────────────────────────────────────
export const GAMES_CONFIG: GameConfig[] = [
  {
    id: "tfadhloon",
    title: "Tfadhloon",
    titleAr: "تفضلون",
    route: "/tfadhloon",
    externalUrl: "www.tfadhloon.com", // 👈 paste Tfadhloon URL here
    status: "active",
    description: "The ultimate party icebreaker — vote, reveal, chaos.",
    descriptionAr: "لعبة الحفلات المثالية — صوّت، اكشف، فوضى.",
  },
  {
    id: "aljasoos",
    title: "Aljasoos",
    titleAr: "الجاسوس",
    route: "/aljasoos",
    externalUrl: "", // 👈 paste Aljasoos URL here
    status: "active",
    description: "Find the spy before they find you.",
    descriptionAr: "اكشف الجاسوس قبل أن يكشفك.",
  },
  {
    id: "flash",
    title: "Flash",
    titleAr: "فلاش",
    route: "/flash",
    externalUrl: "www.dordor.games/flash", // 👈 paste Flash URL here
    status: "active",
    description: "Lightning fast party game.",
    descriptionAr: "لعبة حفلات سريعة البرق.",
  },
  {
    id: "yesno",
    title: "Yes / No",
    titleAr: "نعم / لا",
    route: "/yesno",
    externalUrl: "www.dordor.games/yesno", // 👈 paste Yes/No URL here
    status: "active",
    description: "One question. Two answers. Infinite awkwardness.",
    descriptionAr: "سؤال واحد. إجابتان. إحراج لا نهاية له.",
  },
  {
    id: "bomb",
    title: "Bomb",
    titleAr: "القنبلة",
    route: "/bomb",
    externalUrl: "www.dordor.games/bomb", // 👈 paste Bomb URL here
    status: "active",
    description: "Pass the bomb before it explodes. Categories. Speed.",
    descriptionAr: "مرر القنبلة قبل أن تنفجر. فئات. سرعة.",
  },
  {
    id: "reactor",
    title: "Reactor",
    titleAr: "المفاعل",
    route: "/reactor",
    externalUrl: "www.dordor.games/reactor", // 👈 paste Reactor URL here
    status: "active",
    description: "React fast or face the consequences.",
    descriptionAr: "تصرف بسرعة أو تواجه العواقب.",
  },
  {
    id: "forehead",
    title: "Forehead",
    titleAr: "الجبهة",
    route: "/forehead",
    externalUrl: "https://forehead-game.replit.app/forehead", // 👈 paste Forehead URL here
    status: "active",
    description: "Who am I? Hold it to your forehead and find out.",
    descriptionAr: "من أنا؟ ضعها على جبهتك واكتشف.",
  },
  {
    id: "guessthecharacter",
    title: "Guess the Character",
    titleAr: "خمّن الشخصية",
    route: "/guessthecharacter",
    externalUrl: "https://forehead-game.replit.app/character", // 👈 paste Guess the Character URL here
    status: "active",
    description: "Famous faces, mystery rounds.",
    descriptionAr: "وجوه مشهورة، جولات غامضة.",
  },
  {
    id: "charades",
    title: "Charades",
    titleAr: "الشرادة",
    route: "/charades",
    externalUrl: "https://forehead-game.replit.app/charades", // 👈 paste Charades URL here
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
