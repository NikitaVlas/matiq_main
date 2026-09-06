import { expect, test } from '@playwright/test';

test('Admin sees safe GDPR aggregates and confirms an idempotent retry', async ({ page }) => {
  let retryCalls = 0;
  await page.route('http://localhost:4000/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/auth/admin-login') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"mfaSetupRequired":false}',
      });
    }
    return route.fulfill({ status: 404, body: '{}' });
  });
  await page.route('http://localhost:4001/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const status = {
      scheduled: 2,
      dueSchedules: 1,
      pendingDeletion: 3,
      pendingOutbox: 1,
      staleProcessing: 0,
      failedInbox: 0,
      privacyDeadLetters: 1,
      renewalPending: 2,
      renewalReviewRequired: 0,
      oldestPendingSeconds: 75,
    };
    if (path === '/admin/stats') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"users":1,"trainers":1,"videos":1,"activeAssessmentQuestions":1}',
      });
    }
    if (path === '/admin/viewing-analytics') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"totals":{"paidMs":0,"trialMs":0},"trainers":[]}',
      });
    }
    if (path === '/admin/privacy-operations/retry') {
      expect(request.postDataJSON()).toEqual({ confirmation: 'RETRY' });
      retryCalls++;
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          pendingReleased: 1,
          deadLettersRequeued: 1,
          status: { ...status, pendingOutbox: 2 },
        }),
      });
    }
    if (path === '/admin/privacy-operations') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(status),
      });
    }
    return route.fulfill({ status: 404, body: '{}' });
  });

  await page.goto('/mfa');
  await page.getByLabel('E-Mail').fill('admin@example.invalid');
  await page.getByLabel('Passwort').fill('synthetic-password');
  await page.getByLabel('MFA-Code').fill('123456');
  await page.getByRole('button', { name: 'Dashboard laden' }).click();
  await expect(page.getByRole('heading', { name: 'GDPR-Betriebsstatus' })).toBeVisible();
  await expect(page.getByText('Löschung ausstehend').locator('..')).toContainText('3');
  await expect(page.locator('main')).not.toContainText('admin@example.invalid');

  await page.getByLabel('Bestätigung: RETRY').fill('RETRY');
  await page.getByRole('button', { name: 'Sichere Wiederholung starten' }).click();
  await expect(page.getByRole('status')).toContainText('1 wartende und 1 fehlgeschlagene');
  expect(retryCalls).toBe(1);
});
