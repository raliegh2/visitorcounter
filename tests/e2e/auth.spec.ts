import { expect, test } from "@playwright/test";

test("anonymous users are redirected to sign in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("invalid credentials return a generic error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill("unknown@example.test");
  await page.getByLabel("Password").fill("IncorrectPassword!123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toContainText("Sign-in failed");
});
