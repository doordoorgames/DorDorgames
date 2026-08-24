export type GameStatus = "active" | "coming_soon";

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
  imageUrl?: string;
  hidden?: boolean;
  privateTest?: boolean;
}

export const GAMES_CONFIG: GameConfig[] = [
  {
    id: "spy",
    title: "Spy",
    titleAr: "الجاسوس",
    route: "/spy",
    externalUrl: "https://spy.dordor.games",
    status: "active",
    launchMode: "redirect",
    description: "Find the spy before they find you.",
    descriptionAr: "اكشف الجاسوس قبل أن يكشفك.",
    accentColor: "#cc44ff",
    bgGradient: "linear-gradient(145deg, #0d0020 0%, #2a0045 45%, #4d0080 100%)",
    symbol: "◉",
    imageUrl: "/images/game-spy-v5.png",
  },
  {
    id: "doyouknowme",
    title: "Do You Know Me?",
    titleAr: "تعرفوني؟",
    route: "/doyouknowme",
    externalUrl: "https://doyouknowme.dordor.games",
    status: "coming_soon",
    launchMode: "coming_soon",
    description: "How well do you really know each other?",
    descriptionAr: "كم تعرف الشخص الذي بجانبك؟",
    accentColor: "#ff44aa",
    bgGradient: "linear-gradient(145deg, #1a0015 0%, #4d0040 45%, #8b0066 100%)",
    symbol: "♥",
    imageUrl: "/images/game-doyouknowme-2.jpg",
    privateTest: true,
  },
  {
    id: "tfadhloon",
    title: "Tfadhloon",
    titleAr: "تفضلون",
    route: "/tfadhloon",
    externalUrl: "https://tfadhloon.dordor.games",
    status: "active",
    launchMode: "redirect",
    description: "The ultimate party icebreaker.",
    descriptionAr: "لعبة الحفلات المثالية.",
    accentColor: "#ffcc00",
    bgGradient: "linear-gradient(145deg, #1a1400 0%, #4a3800 45%, #8b6800 100%)",
    symbol: "★",
    imageUrl: "/images/game-tfadhloon-v4.png",
  },
  {
    id: "forehead",
    title: "Guess Your Word",
    titleAr: "خمن كلمتك",
    route: "/forehead",
    externalUrl: "https://guessyourword.dordor.games",
    status: "active",
    launchMode: "redirect",
    description: "Hold it to your forehead and find out.",
    descriptionAr: "ضعها على جبهتك واكتشف.",
    accentColor: "#ff4499",
    bgGradient: "linear-gradient(145deg, #1a0015 0%, #4d0040 45%, #8b0060 100%)",
    symbol: "◎",
    imageUrl: "/images/game-forehead-v2.jpg",
  },
  {
    id: "flash",
    title: "Flash",
    titleAr: "فلاش",
    route: "/flash",
    externalUrl: "https://flash.dordor.games",
    status: "coming_soon",
    launchMode: "coming_soon",
    description: "Lightning fast memory game.",
    descriptionAr: "لعبة ذاكرة سريعة كالبرق.",
    accentColor: "#bf00ff",
    bgGradient: "linear-gradient(145deg, #0d0020 0%, #2d0055 45%, #5b0fa8 100%)",
    symbol: "⚡",
    imageUrl: "/images/game-flash-v3.png",
    privateTest: true,
  },
  {
    id: "reactor",
    title: "Reactor",
    titleAr: "المفاعل",
    route: "/reactor",
    externalUrl: "https://reactor.dordor.games",
    status: "active",
    launchMode: "redirect",
    description: "React fast or face consequences.",
    descriptionAr: "تصرف بسرعة أو تواجه العواقب.",
    accentColor: "#00ff41",
    bgGradient: "linear-gradient(145deg, #001400 0%, #003800 45%, #006600 100%)",
    symbol: "◈",
    hidden: true,
  },
  {
    id: "yesno",
    title: "Yes / No",
    titleAr: "نعم / لا",
    route: "/yesno",
    externalUrl: "https://yesno.dordor.games",
    status: "coming_soon",
    launchMode: "coming_soon",
    description: "One question. Two answers. Infinite chaos.",
    descriptionAr: "سؤال واحد. إجابتان. فوضى لا نهاية لها.",
    accentColor: "#00ccff",
    bgGradient: "linear-gradient(145deg, #00061a 0%, #001550 45%, #002a8b 100%)",
    symbol: "◐",
    imageUrl: "/images/game-yesno-v3.png",
    privateTest: true,
  },
  {
    id: "guessthecharacter",
    title: "Guess the Character",
    titleAr: "خمّن الشخصية",
    route: "/guessthecharacter",
    externalUrl: "https://guessthecharacter.dordor.games",
    status: "active",
    launchMode: "redirect",
    description: "Famous faces, mystery rounds.",
    descriptionAr: "وجوه مشهورة، جولات غامضة.",
    accentColor: "#aa44ff",
    bgGradient: "linear-gradient(145deg, #08001a 0%, #1e0055 45%, #3a0090 100%)",
    symbol: "?",
    imageUrl: "/images/game-guess-v5.jpg",
  },
  {
    id: "charades",
    title: "Charades",
    titleAr: "بدون كلام",
    route: "/charades",
    externalUrl: "https://charades.dordor.games",
    status: "active",
    launchMode: "redirect",
    description: "Act it out. No words allowed.",
    descriptionAr: "مثّلها. لا كلمات مسموحة.",
    accentColor: "#ff8800",
    bgGradient: "linear-gradient(145deg, #1a0800 0%, #4a2000 45%, #8b4000 100%)",
    symbol: "✦",
    imageUrl: "/images/game-charades-v3.png",
  },
  {
    id: "dots",
    title: "Nawafeth",
    titleAr: "نوافذ",
    route: "/dots",
    externalUrl: "https://nawafeth.dordor.games",
    status: "coming_soon",
    launchMode: "coming_soon",
    description: "Connect the dots. Outsmart your friends.",
    descriptionAr: "وصّل النقاط. تفوّق على أصدقائك.",
    accentColor: "#ffaa00",
    bgGradient: "linear-gradient(145deg, #1a0e00 0%, #3d2200 45%, #6b3d00 100%)",
    symbol: "•",
    imageUrl: "/images/game-nawafeth.png",
    privateTest: true,
  },
  {
    id: "bomb",
    title: "Bomb",
    titleAr: "القنبلة",
    route: "/bomb",
    externalUrl: "https://bomb.dordor.games",
    status: "coming_soon",
    launchMode: "coming_soon",
    description: "Pass the bomb before it explodes.",
    descriptionAr: "مرر القنبلة قبل أن تنفجر.",
    accentColor: "#ff2200",
    bgGradient: "linear-gradient(145deg, #1a0000 0%, #4a0800 45%, #8b1500 100%)",
    symbol: "●",
    imageUrl: "/images/game-bomb-v3.png",
    privateTest: true,
  },
];

export function getGameByRoute(route: string): GameConfig | undefined {
  return GAMES_CONFIG.find((g) => g.route === route);
}

export function getGameById(id: string): GameConfig | undefined {
  return GAMES_CONFIG.find((g) => g.id === id);
}
