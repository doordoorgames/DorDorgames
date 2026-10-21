import { expect, test } from "@playwright/test";

test("room join redirects signed-out players to account login", async ({ page }) => {
  await page.route("**/api/auth/me", (route) => route.fulfill({ status: 401, contentType: "application/json", body: '{"error":"Authentication required"}' }));
  await page.route("**/api/auth/refresh", (route) => route.fulfill({ status: 401, contentType: "application/json", body: '{"error":"Session expired"}' }));

  await page.goto("/join/ABCDE");

  await expect(page).toHaveURL(/\/account\?returnTo=%2Fjoin%2FABCDE$/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("signed-in participants can reach join and get their profile name", async ({ page }) => {
  await page.route("**/api/auth/me", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ id: "participant-1", role: "participant", fullName: "Dana Player", email: "dana@example.com", phone: "+96550000000", phoneVerified: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), trialUsed: false, remainingMinutes: 0 }),
  }));

  await page.goto("/join/ABCDE");

  await expect(page.getByText("Signed in as Dana Player")).toBeVisible();
  await expect(page.getByPlaceholder("NICKNAME / الاسم المستعار")).toHaveValue("Dana Player");
});
