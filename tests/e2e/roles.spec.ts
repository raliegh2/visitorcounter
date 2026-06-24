import { expect, test } from "@playwright/test";

const usherEmail=process.env.E2E_USHER_EMAIL;
const usherPassword=process.env.E2E_USHER_PASSWORD;
const auditorEmail=process.env.E2E_AUDITOR_EMAIL;
const auditorPassword=process.env.E2E_AUDITOR_PASSWORD;

test("usher navigation excludes administrator pages", async ({ page }) => {
  test.skip(!usherEmail||!usherPassword,"Set E2E_USHER_EMAIL and E2E_USHER_PASSWORD.");
  await page.goto("/login");
  await page.getByLabel("Email address").fill(usherEmail!);
  await page.getByLabel("Password").fill(usherPassword!);
  await page.getByRole("button",{name:"Sign in"}).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("link",{name:"Visitors"})).toBeVisible();
  await expect(page.getByRole("link",{name:"Users & roles"})).toHaveCount(0);
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/unauthorized|\/login/);
});

test("auditor cannot access visitor registration", async ({ page }) => {
  test.skip(!auditorEmail||!auditorPassword,"Set E2E_AUDITOR_EMAIL and E2E_AUDITOR_PASSWORD.");
  await page.goto("/login");
  await page.getByLabel("Email address").fill(auditorEmail!);
  await page.getByLabel("Password").fill(auditorPassword!);
  await page.getByRole("button",{name:"Sign in"}).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("link",{name:"Reports"})).toBeVisible();
  await expect(page.getByRole("link",{name:"Visitors"})).toHaveCount(0);
  await page.goto("/visitors");
  await expect(page).toHaveURL(/\/unauthorized|\/login/);
});
