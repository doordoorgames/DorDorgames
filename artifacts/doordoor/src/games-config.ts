export type GameStatus = "active" | "coming_soon";

// "iframe"    — game loads inside a full-screen iframe on this domain.
//               Browser URL stays on dordor.games/flash. No visible redirect.
// "redirect"  — user is navigated to a separate domain (opens in new tab).
// "coming_soon" — not yet available.
export type LaunchMode = "iframe" | "redirect" | "coming_soon";

export interface GameConfig {
  id: string;
  title: string;
  titleAr: string;
  route: string;
  externalUrl: string;
  status: GameStatus;
  launchMode: LaunchMode;
  description?: string;
  descriptionAr?: string;
}

export const GAMES_CONFIG: GameConfig[] = [
  {
    id: "tfadhloon",
    title: "Tfadhloon",
    titleAr: "تفضلون",
    route: "/tfadhloon",
    externalUrl: "https://www.tfadhloon.com",
    status: "active",
    launchMode: "redirect",
    description: "The ultimate party icebreaker — vote, reveal, chaos.",
    descriptionAr: "لعبة الحفلات المثالية — صوّت، اكشف، فوضى.",
  },
  {
    id: "aljasoos",
    title: "Aljasoos",
    titleAr: "الجاسوس",
    route: "/aljasoos",
    externalUrl: "",
    status: "coming_soon",
    launchMode: "coming_soon",
    description: "Find the spy before they find you.",
    descriptionAr: "اكشف الجاسوس قبل أن يكشفك.",
  },
  {
    id: "flash",
    title: "Flash",
    titleAr: "فلاش",
    route: "/flash",
    externalUrl: "https://flash-billboard.replit.app/flash",
    status: "active",
    launchMode: "iframe",
    description: "Lightning fast party game.",
    descriptionAr: "لعبة حفلات سريعة البرق.",
  },
  {
    id: "yesno",
    title: "Yes / No",
    titleAr: "نعم / لا",
    route: "/yesno",
    externalUrl: "https://flash-billboard.replit.app/yesno",
    status: "active",
    launchMode: "iframe",
    description: "One question. Two answers. Infinite awkwardness.",
    descriptionAr: "سؤال واحد. إجابتان. إحراج لا نهاية له.",
  },
  {
    id: "bomb",
    title: "Bomb",
    titleAr: "القنبلة",
    route: "/bomb",
    externalUrl: "https://flash-billboard.replit.app/bomb",
    status: "active",
    launchMode: "iframe",
    description: "Pass the bomb before it explodes. Categories. Speed.",
    descriptionAr: "مرر القنبلة قبل أن تنفجر. فئات. سرعة.",
  },
  {
    id: "reactor",
    title: "Reactor",
    titleAr: "المفاعل",
    route: "/reactor",
    externalUrl: "https://flash-billboard.replit.app/reactor",
    status: "active",
    launchMode: "iframe",
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
    launchMode: "iframe",
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
    launchMode: "iframe",
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
    launchMode: "iframe",
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
