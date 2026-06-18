import { test, expect } from "@playwright/test";

test.describe("MapMyTrain Smoke Tests", () => {
  test("homepage loads with title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/MapMyTrain/);
  });

  test("map canvas renders", async ({ page }) => {
    await page.goto("/");
    const canvas = page.locator("canvas.maplibregl-canvas");
    await expect(canvas).toBeVisible({ timeout: 15000 });
  });

  test("search bar is present and functional", async ({ page }) => {
    await page.goto("/");
    const searchInput = page.locator('input[placeholder*="train"]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill("12951");
    await expect(searchInput).toHaveValue("12951");
  });

  test("status bar shows connection status", async ({ page }) => {
    await page.goto("/");
    const statusBar = page.locator('[class*="StatusBar"]');
    await expect(statusBar).toBeVisible({ timeout: 10000 });
  });

  test("no console errors on load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });
    await page.goto("/");
    await page.waitForTimeout(5000);
    const criticalErrors = errors.filter(
      (e) => !e.includes("WebSocket") && !e.includes("favicon")
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
