// Translation dictionary for English and Arabic
const translations = {
  en: {
    selectCategory: "Select Category",
    startGame: "Start Game",
    joinGame: "Join Game",
    clearName: "Clear Saved Name",
    enterName: "Enter your name",
    enterGameCode: "Enter Game Code",
    gameTitle: "Spyfall Game",
    adHere: "",
    lobbyTitle: "Game Lobby",
    waitingPlayers: "Waiting for players...",
    accessCodeLabel: "Access Code",
    adminSettings: "Players",
    hostSettings: "Host Settings",
    startGame: "Start Game",
    questionLimit5: "5 Questions",
    questionLimit10: "10 Questions",
    questionLimit20: "20 Questions",
    questionLimit30: "30 Questions",
    questionLimit40: "40 Questions",
    questionLimit80: "80 Questions",
    questionLimit100: "100 Questions",
    nameTakenError: "This name is already taken. Please choose a different name.",
    enterName: "Enter Name",
    confirmName: "Confirm Name",
    join: "Join",
    "back": "Back",
    // ...add all other UI strings here
  },
  ar: {
    selectCategory: "اختر نوع الاسئلة",
    startGame: "ابدأ اللعبة",
    joinGame: "لعبة الانضمام",
    clearName: "مسح الاسم المحفوظ",
    enterName: "ادخل اسمك",
    enterGameCode: "ادخل رمز اللعبة",
    gameTitle: "لعبة الجاسوس",
    adHere: "",
    lobbyTitle: "صالة اللعبة",
    waitingPlayers: "في انتظار اللاعبين...",
    accessCodeLabel: "رمز الدخول",
    adminSettings: "اللاعبون",
    hostSettings: "إعدادات المضيف",
    startGame: "ابدأ اللعبة",
    questionLimit5: "5 سؤالًا",
    questionLimit10: "10 سؤالًا",
    questionLimit20: "20 سؤالًا",
    questionLimit30: "30 سؤالًا",
    questionLimit40: "40 سؤال",
    questionLimit80: "80 سؤال",
    questionLimit100: "100 سؤال",
    nameTakenError: "هذا الاسم مستخدم مسبقاً. الرجاء اختيار اسم آخر.",
    enterName: "أدخل الاسم",
    confirmName: "تأكيد الاسم",
    join: "انضم",
    "back": "رجوع"
    // ...add all other UI strings here
  },
};

// Utility to get translation
function t(key) {
  const lang = localStorage.getItem("lang") || "ar";
  return translations[lang][key] || key;
}
