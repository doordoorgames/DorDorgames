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
  accentColor: string;
  bgGradient: string;
  symbol: string;
}

export const GAMES_CONFIG: GameConfig[] = [
  {
    id: "flash",
    title: "Flash",
    titleAr: "فلاش",
    route: "/flash",
    externalUrl: "https://flash-billboard.replit.app/flash",
    status: "active",
    launchMode: "iframe",
    description: "Lightning fast memory game.",
    descriptionAr: "لعبة ذاكرة سريعة كالبرق.",
    accentColor: "#bf00ff",
    bgGradient: "linear-gradient(145deg, #0d0020 0%, #2d0055 45%, #5b0fa8 100%)",
    symbol: "⚡",
  },
  {
    id: "bomb",
    title: "Bomb",
    titleAr: "القنبلة",
    route: "/bomb",
    externalUrl: "https://flash-billboard.replit.app/bomb",
    status: "active",
    launchMode: "iframe",
    description: "Pass the bomb before it explodes.",
    descriptionAr: "مرر القنبلة قبل أن تنفجر.",
    accentColor: "#ff2200",
    bgGradient: "linear-gradient(145deg, #1a0000 0%, #4a0800 45%, #8b1500 100%)",
    symbol: "●",
  },
  {
    id: "reactor",
    title: "Reactor",
    titleAr: "المفاعل",
    route: "/reactor",
    externalUrl: "https://flash-billboard.replit.app/reactor",
    status: "active",
    launchMode: "iframe",
    description: "React fast or face consequences.",
    descriptionAr: "تصرف بسرعة أو تواجه العواقب.",
    accentColor: "#00ff41",
    bgGradient: "linear-gradient(145deg, #001400 0%, #003800 45%, #006600 100%)",
    symbol: "◈",
  },
  {
    id: "forehead",
    title: "Forehead",
    titleAr: "الجبهة",
    route: "/forehead",
    externalUrl: "https://forehead-game.replit.app/forehead",
    status: "active",
    launchMode: "iframe",
    description: "Hold it to your forehead and find out.",
    descriptionAr: "ضعها على جبهتك واكتشف.",
    accentColor: "#ff4499",
    bgGradient: "linear-gradient(145deg, #1a0015 0%, #4d0040 45%, #8b0060 100%)",
    symbol: "◎",
  },
  {
    id: "yesno",
    title: "Yes / No",
    titleAr: "نعم / لا",
    route: "/yesno",
    externalUrl: "https://flash-billboard.replit.app/yesno",
    status: "active",
    launchMode: "iframe",
    description: "One question. Two answers. Infinite chaos.",
    descriptionAr: "سؤال واحد. إجابتان. فوضى لا نهاية لها.",
    accentColor: "#00ccff",
    bgGradient: "linear-gradient(145deg, #00061a 0%, #001550 45%, #002a8b 100%)",
    symbol: "◐",
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
    accentColor: "#aa44ff",
    bgGradient: "linear-gradient(145deg, #08001a 0%, #1e0055 45%, #3a0090 100%)",
    symbol: "?",
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
    accentColor: "#ff8800",
    bgGradient: "linear-gradient(145deg, #1a0800 0%, #4a2000 45%, #8b4000 100%)",
    symbol: "✦",
  },
  {
    id: "tfadhloon",
    title: "Tfadhloon",
    titleAr: "تفضلون",
    route: "/tfadhloon",
    externalUrl: "https://www.tfadhloon.com",
    status: "active",
    launchMode: "redirect",
    description: "The ultimate party icebreaker.",
    descriptionAr: "لعبة الحفلات المثالية.",
    accentColor: "#ffcc00",
    bgGradient: "linear-gradient(145deg, #1a1400 0%, #4a3800 45%, #8b6800 100%)",
    symbol: "★",
  },
  {
    id: "movie-radar",
    title: "Movie Radar",
    titleAr: "رادار الأفلام",
    route: "/movie-radar",
    externalUrl: "",
    status: "coming_soon",
    launchMode: "coming_soon",
    description: "VHS vibes. Retro cinema quizzes.",
    descriptionAr: "أجواء VHS. اختبارات سينما كلاسيكية.",
    accentColor: "#ff9933",
    bgGradient: "linear-gradient(145deg, #1a0d00 0%, #3d2200 45%, #6b3d00 100%)",
    symbol: "▶",
  },
  {
    id: "fun-challenges",
    title: "Fun Challenges",
    titleAr: "تحديات مرحة",
    route: "/fun-challenges",
    externalUrl: "",
    status: "coming_soon",
    launchMode: "coming_soon",
    description: "City pop nights. Neon dares.",
    descriptionAr: "ليالي نيون. تحديات مضحكة.",
    accentColor: "#ff00aa",
    bgGradient: "linear-gradient(145deg, #1a0011 0%, #4d0033 30%, #1a0055 70%, #003355 100%)",
    symbol: "◆",
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
    accentColor: "#44aaff",
    bgGradient: "linear-gradient(145deg, #000d1a 0%, #001a33 45%, #002d55 100%)",
    symbol: "◉",
  },
];

export function getGameByRoute(route: string): GameConfig | undefined {
  return GAMES_CONFIG.find((g) => g.route === route);
}

export function getGameById(id: string): GameConfig | undefined {
  return GAMES_CONFIG.find((g) => g.id === id);
}
