import { expect, test } from '@playwright/test';

const receipt = {
  requestId: 'synthetic-request',
  statusToken: 'synthetic-status-token-not-a-real-secret',
  statusTokenExpiresAt: '2099-01-01T00:00:00.000Z',
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((value) => {
    sessionStorage.setItem('matiq.accountDeletionStatus', JSON.stringify(value));
  }, receipt);
});

test('network failure is announced and retry remains keyboard accessible', async ({ page }) => {
  await page.route('http://localhost:4000/auth/account-deletion/status', (route) => route.abort());
  await page.goto('/account-deletion-status');
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Verbindung');
  const retry = page.getByRole('button', { name: 'Status aktualisieren' });
  await expect(retry).toBeEnabled();
  await retry.focus();
  await expect(retry).toBeFocused();
  await page.route('http://localhost:4000/auth/account-deletion/status', (route) =>
    route.fulfill({
      json: {
        requestId: receipt.requestId,
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
      },
    }),
  );
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Löschung abgeschlossen' })).toBeVisible();
  expect(page.url()).not.toContain(receipt.statusToken);
  expect(await page.evaluate(() => localStorage.getItem('matiq.accountDeletionStatus'))).toBeNull();
});

test('pending mobile status does not exhaust the hourly rate limit', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install();
  let requests = 0;
  await page.route('http://localhost:4000/auth/account-deletion/status', (route) => {
    requests++;
    return route.fulfill({ json: { requestId: receipt.requestId, status: 'PENDING' } });
  });
  await page.goto('/account-deletion-status');
  await expect(page.getByRole('heading', { name: 'Löschung läuft' })).toBeVisible();
  await page.clock.runFor(60_000);
  expect(requests).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
});

test('invalid status response never claims deletion is complete', async ({ page }) => {
  await page.route('http://localhost:4000/auth/account-deletion/status', (route) =>
    route.fulfill({
      status: 404,
      json: { message: 'DELETION_STATUS_NOT_FOUND' },
    }),
  );
  await page.goto('/account-deletion-status');
  await expect(page.getByRole('main').getByRole('alert')).toContainText('nicht mehr verfügbar');
  await expect(page.getByRole('heading', { name: 'Löschung abgeschlossen' })).toHaveCount(0);
});
