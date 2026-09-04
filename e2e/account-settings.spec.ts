import { expect, test, type Route } from '@playwright/test';

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    headers: {
      'access-control-allow-origin': 'http://localhost:3100',
      'access-control-allow-credentials': 'true',
    },
    body: JSON.stringify(body),
  });
}

test('athlete manages sessions, enables MFA, and confirms deletion securely', async ({ page }) => {
  let deleted = false;

  await page.route('http://localhost:4000/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (path === '/auth/me') {
      return json(route, {
        email: 'athlete@matiq.local',
        emailVerified: true,
        athleteProfileCompleted: true,
        mfaEnabled: false,
      });
    }
    if (path === '/auth/sessions' && request.method() === 'GET') {
      return json(route, [
        {
          id: 'current-session',
          createdAt: '2026-07-30T10:00:00.000Z',
          lastSeenAt: '2026-07-30T11:00:00.000Z',
          current: true,
        },
        {
          id: 'old-session',
          createdAt: '2026-07-29T10:00:00.000Z',
          lastSeenAt: '2026-07-29T11:00:00.000Z',
          current: false,
        },
      ]);
    }
    if (path === '/auth/sessions/old-session' && request.method() === 'DELETE') {
      return json(route, { revoked: true });
    }
    if (path === '/auth/mfa/setup') {
      return json(route, { secret: 'TESTSECRET123', otpauthUrl: 'otpauth://test' });
    }
    if (path === '/auth/mfa/confirm') {
      expect(request.postDataJSON()).toEqual({ code: '123456' });
      return json(route, { recoveryCodes: ['recovery-one', 'recovery-two'] });
    }
    if (path === '/auth/reauthenticate') {
      expect(request.postDataJSON()).toEqual({ password: 'Current-password-123' });
      return json(route, { reauthenticated: true });
    }
    if (path === '/auth/account' && request.method() === 'DELETE') {
      expect(request.postDataJSON()).toEqual({ confirmation: 'DELETE' });
      deleted = true;
      return json(route, {
        accepted: true,
        requestId: 'test-deletion',
        statusToken: 'synthetic-status-token',
        statusTokenExpiresAt: '2099-01-01T00:00:00.000Z',
      });
    }
    if (path === '/auth/account-deletion/status') {
      return json(route, { requestId: 'test-deletion', status: 'COMPLETED' });
    }

    return json(route, {});
  });

  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Einstellungen' })).toBeVisible();
  await expect(page.getByText('athlete@matiq.local')).toBeVisible();

  await page.getByRole('button', { name: 'Sitzung beenden' }).click();
  await expect(page.getByText('Sitzung beendet.')).toBeVisible();
  await expect(page.getByText('Weitere Sitzung')).not.toBeVisible();

  await page.getByRole('button', { name: 'MFA einrichten' }).click();
  await expect(page.getByText('TESTSECRET123')).toBeVisible();
  await page.getByLabel('Sechsstelliger MFA-Code').fill('123456');
  await page.getByRole('button', { name: 'MFA bestätigen' }).click();
  await expect(page.getByText('recovery-one')).toBeVisible();

  await page.getByLabel('Passwort zur Bestätigung').fill('Current-password-123');
  await page.getByLabel('Gib DELETE ein').fill('DELETE');
  await page.getByRole('button', { name: 'Konto endgültig löschen' }).click();
  await expect.poll(() => deleted).toBe(true);
  await expect(page).toHaveURL(/\/account-deletion-status$/);
  await expect(page.getByRole('heading', { name: 'Löschung abgeschlossen' })).toBeVisible();
});
