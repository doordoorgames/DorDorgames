export const PAYMENT_PACKAGES = {
  starter: {
    id: "starter",
    name: "Starter",
    amountFils: 2_000,
    minutes: 120,
  },
  "game-night": {
    id: "game-night",
    name: "Game Night",
    amountFils: 6_000,
    minutes: 480,
  },
  ultimate: {
    id: "ultimate",
    name: "Ultimate Party",
    amountFils: 10_000,
    minutes: 960,
  },
} as const;

export type PaymentPackage =
  (typeof PAYMENT_PACKAGES)[keyof typeof PAYMENT_PACKAGES];

export function getPaymentPackage(id: string): PaymentPackage | undefined {
  return PAYMENT_PACKAGES[id as keyof typeof PAYMENT_PACKAGES];
}
