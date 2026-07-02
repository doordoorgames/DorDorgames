import { test, expect } from "@playwright/test";
import { nanoid } from "nanoid";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin999";
const ADMIN_TOKEN = "doordoor-admin-token-2024";
const BASE_URL = process.env.BASE_URL || "http://localhost:80";

test.describe("Admin panel — game management", () => {
  test("admin can log in and reach the dashboard", async ({ page }) => {
    await page.goto("/admin");

    await expect(page.getByText("ADMIN SYS")).toBeVisible();

    await page.fill('input[placeholder="USERNAME"]', ADMIN_USERNAME);
    await page.fill('input[placeholder="PASSWORD"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForURL("**/admin/dashboard", { timeout: 10_000 });

    await expect(page.getByText("ADMIN_OS")).toBeVisible();
    await expect(page.getByRole("button", { name: "GAMES" })).toBeVisible();
  });

  test("admin can create a new game and see it appear in the games list", async ({ page }) => {
    const slug = `test-${nanoid(6)}`;
    const title = `Test Game ${slug}`;

    await page.goto("/admin");
    await page.fill('input[placeholder="USERNAME"]', ADMIN_USERNAME);
    await page.fill('input[placeholder="PASSWORD"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/admin/dashboard", { timeout: 10_000 });

    const gamesTab = page.getByRole("button", { name: "GAMES" });
    await gamesTab.click();

    await page.fill('[data-testid="game-title-input"]', title);
    await page.fill('[data-testid="game-slug-input"]', slug);
    await page.click('[data-testid="create-game-button"]');

    await expect(page.getByText("GAME CREATED", { exact: true })).toBeVisible({ timeout: 8_000 });

    await expect(page.getByRole("heading", { name: title })).toBeVisible({ timeout: 8_000 });
  });

  test("admin can toggle a game's status between active and coming_soon", async ({ page }) => {
    const slug = `toggle-${nanoid(6)}`;
    const title = `Toggle Game ${slug}`;

    await fetch(`${BASE_URL}/api/games`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, titleAr: title, slug, status: "active", visible: true }),
    });

    await page.goto("/admin");
    await page.fill('input[placeholder="USERNAME"]', ADMIN_USERNAME);
    await page.fill('input[placeholder="PASSWORD"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/admin/dashboard", { timeout: 10_000 });

    const gamesTab = page.getByRole("button", { name: "GAMES" });
    await gamesTab.click();

    await expect(page.getByRole("heading", { name: title })).toBeVisible({ timeout: 8_000 });

    const statusBadge = page.locator(`[data-testid="game-status-${slug}"]`);
    await expect(statusBadge).toHaveText("active");

    const toggleBtn = page.locator(`[data-testid="toggle-status-${slug}"]`);
    await toggleBtn.click();

    await expect(statusBadge).toHaveText("coming_soon", { timeout: 8_000 });

    await toggleBtn.click();
    await expect(statusBadge).toHaveText("active", { timeout: 8_000 });
  });

  test("unauthenticated requests to admin API routes return 401", async ({ request }) => {
    const statsRes = await request.get(`${BASE_URL}/api/admin/stats`);
    expect(statsRes.status()).toBe(401);

    const promoGetRes = await request.get(`${BASE_URL}/api/admin/promo-codes`);
    expect(promoGetRes.status()).toBe(401);

    const promoPostRes = await request.post(`${BASE_URL}/api/admin/promo-codes`, {
      data: { code: "HACK", active: true },
    });
    expect(promoPostRes.status()).toBe(401);

    const promoDelRes = await request.delete(`${BASE_URL}/api/admin/promo-codes/HACK`);
    expect(promoDelRes.status()).toBe(401);
  });
});
