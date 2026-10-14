export const HOSTING_PACKAGES = [
  {
    id: "starter",
    name: "Starter",
    nameAr: "البداية",
    price: 2,
    paid: 1,
    bonus: 0,
    provisional: false,
  },
  {
    id: "game-night",
    name: "Game Night",
    nameAr: "ليلة الألعاب",
    price: 6,
    paid: 3,
    bonus: 1,
    provisional: false,
  },
  {
    id: "ultimate",
    name: "Ultimate Party",
    nameAr: "الحفلة الكبرى",
    price: 10,
    paid: 5,
    bonus: 3,
    provisional: true,
  },
] as const;

export const HOURS_PER_BLOCK = 2;
export function packagePrice(price: number, arabic: boolean) {
  return new Intl.NumberFormat(arabic ? "ar-KW" : "en-KW", {
    style: "currency",
    currency: "KWD",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(price);
}
