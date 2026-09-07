import { expect, test, type Page, type Route } from '@playwright/test';

function json(route: Route, body: unknown) {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: {
      'access-control-allow-origin': 'http://localhost:3100',
      'access-control-allow-credentials': 'true',
    },
    body: JSON.stringify(body),
  });
}

async function expectAccessibilityBaseline(page: Page) {
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  expect(
    await page.locator('[id]').evaluateAll((elements) => {
      const ids = elements.map((element) => element.id).filter(Boolean);
      return ids.length === new Set(ids).size;
    }),
  ).toBe(true);
  expect(
    await page.locator('input, select, textarea').evaluateAll((controls) =>
      controls.every((control) => {
        const element = control as HTMLInputElement;
        if (element.type === 'hidden') return true;
        const labelled = element.labels && element.labels.length > 0;
        return Boolean(
          labelled || element.getAttribute('aria-label') || element.getAttribute('aria-labelledby'),
        );
      }),
    ),
  ).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
}

test('settings keeps labels, landmarks and keyboard focus on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('http://localhost:4000/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/auth/account/deletion-schedule')
      return json(route, { scheduled: false, executeAt: null, renewalConfirmed: false });
    if (path === '/auth/me')
      return json(route, { email: 'athlete@matiq.local', emailVerified: true, mfaEnabled: false });
    if (path === '/auth/sessions') return json(route, []);
    return json(route, {});
  });
  await page.goto('/settings');
  await expectAccessibilityBaseline(page);
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY');
});

test('login exposes its form and error state to keyboard users', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('http://localhost:4000/auth/login', (route) =>
    route.fulfill({ status: 401, json: { message: 'INVALID_CREDENTIALS' } }),
  );
  await page.goto('/login');
  await expectAccessibilityBaseline(page);
  await page.getByLabel('E-Mail').fill('athlete@matiq.local');
  await page.getByLabel('Passwort').fill('Wrong-password-123');
  await page.getByRole('button', { name: 'Anmelden' }).focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('alert').filter({ hasText: 'E-Mail-Adresse oder Passwort' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Anmelden' })).toBeEnabled();
});
