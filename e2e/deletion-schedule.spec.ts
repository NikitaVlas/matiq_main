import { expect, test } from '@playwright/test';

test('schedule remains pending until confirmation and cancellation can retry without resuming renewal', async ({
  page,
}) => {
  let scheduled = false;
  let failCancel = true;
  let renewalConfirmed = false;
  let resumeCalls = 0;
  await page.route('http://localhost:4000/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const reply = (body: unknown) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'access-control-allow-origin': 'http://localhost:3100',
          'access-control-allow-credentials': 'true',
          'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
          'access-control-allow-headers': 'content-type',
        },
        body: JSON.stringify(body),
      });
    if (request.method() === 'OPTIONS') return reply({});
    if (path.includes('/resume')) resumeCalls++;
    if (path === '/auth/me')
      return reply({ email: 'athlete@example.invalid', emailVerified: true, mfaEnabled: false });
    if (path === '/auth/sessions') return reply([]);
    if (path === '/auth/reauthenticate') return reply({ reauthenticated: true });
    if (path === '/auth/account/deletion-schedule') {
      if (request.method() === 'POST') {
        expect(request.postDataJSON()).toEqual({ confirmation: 'DELETE' });
        scheduled = true;
      }
      if (request.method() === 'DELETE') {
        if (failCancel) {
          failCancel = false;
          return route.abort();
        }
        scheduled = false;
      }
      return reply({
        scheduled,
        executeAt: scheduled ? '2099-09-30T12:00:00Z' : null,
        renewalConfirmed,
      });
    }
    return reply({});
  });
  await page.goto('/settings');
  await page.getByLabel('Passwort für die Löschplanung').fill('Current-password-123');
  await page.getByLabel('Bestätigung der Planung: DELETE').fill('DELETE');
  await page.getByRole('button', { name: 'Am Ende des bezahlten Zeitraums löschen' }).click();
  await expect(
    page.getByText(/Bestätigung zur Deaktivierung der Verlängerung steht noch aus/),
  ).toBeVisible();
  renewalConfirmed = true;
  await page.getByRole('button', { name: 'Löschstatus aktualisieren' }).click();
  await expect(page.getByText(/Löschung geplant:.*Verlängerung deaktiviert/)).toBeVisible();
  await page.getByLabel('Passwort für die Löschplanung').fill('Current-password-123');
  await page.getByRole('button', { name: 'Geplante Löschung aufheben' }).click();
  await expect(page.locator('.settings-message[role="alert"]')).toContainText(
    'Verbindung fehlgeschlagen',
  );
  await expect(page.getByRole('button', { name: 'Geplante Löschung aufheben' })).toBeEnabled();
  await page.getByRole('button', { name: 'Geplante Löschung aufheben' }).click();
  await expect(
    page.getByRole('button', { name: 'Am Ende des bezahlten Zeitraums löschen' }),
  ).toBeVisible();
  expect(resumeCalls).toBe(0);
});
