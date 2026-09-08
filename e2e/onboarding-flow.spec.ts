import { expect, test, type Route } from '@playwright/test';
import { expectNoWcagViolations } from './wcag';

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

test('athlete registers, verifies the email and completes the profile', async ({ page }) => {
  const requests: Array<{ path: string; body: unknown }> = [];
  await page.route('http://localhost:4000/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === 'OPTIONS') return json(route, {});
    if (request.method() === 'POST' && path === '/auth/register') {
      requests.push({ path, body: request.postDataJSON() });
      return json(route, { registered: true }, 201);
    }
    if (request.method() === 'POST' && path === '/auth/verify-email') {
      requests.push({ path, body: request.postDataJSON() });
      return json(route, { verified: true });
    }
    if (request.method() === 'PUT' && path === '/athlete-profile') {
      requests.push({ path, body: request.postDataJSON() });
      return json(route, { completed: true });
    }
    return json(route, {});
  });

  await page.goto('/register');
  await expectNoWcagViolations(page);
  await page.getByLabel('E-Mail').fill('new-athlete@matiq.local');
  await page.getByLabel('Passwort').fill('Strong-password-123');
  await page.getByRole('button', { name: 'Konto erstellen' }).click();
  await expect(page).toHaveURL(/\/check-email\?email=new-athlete%40matiq\.local$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Prüfe dein Postfach' })).toBeVisible();
  await expectNoWcagViolations(page);

  await page.goto('/verify-email?token=verification-token');
  await page.getByRole('button', { name: 'E-Mail bestätigen' }).click();
  await expect(page).toHaveURL(/\/onboarding\/profile$/);
  await expectNoWcagViolations(page);

  await page.getByLabel('BJJ Gi').check();
  await page.getByLabel('Gürtel').selectOption('WHITE');
  await page.getByLabel('Trainingserfahrung in Monaten').fill('8');
  await page.getByLabel('Trainings pro Woche').fill('3');
  await page.getByLabel('Wettkampferfahrung').selectOption('yes');
  await page.getByLabel('Allgemeine Entwicklung').check();
  await page.getByRole('button', { name: 'Profil speichern' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expectNoWcagViolations(page);

  expect(requests).toEqual([
    {
      path: '/auth/register',
      body: { email: 'new-athlete@matiq.local', password: 'Strong-password-123' },
    },
    { path: '/auth/verify-email', body: { token: 'verification-token' } },
    {
      path: '/athlete-profile',
      body: {
        disciplines: ['BJJ_GI'],
        belt: 'WHITE',
        experienceMonths: 8,
        experienceYears: 0,
        trainingSessionsPerWeek: 3,
        competitionExperience: true,
        goals: ['GENERAL_DEVELOPMENT'],
      },
    },
  ]);
});

test('registration validation failure is announced and can be retried', async ({ page }) => {
  let attempts = 0;
  await page.route('http://localhost:4000/auth/register', async (route) => {
    attempts += 1;
    return attempts === 1
      ? json(route, { message: 'E-Mail-Adresse ist bereits registriert.' }, 409)
      : json(route, { registered: true }, 201);
  });

  await page.goto('/register');
  await page.getByLabel('E-Mail').fill('athlete@matiq.local');
  await page.getByLabel('Passwort').fill('Strong-password-123');
  await page.getByRole('button', { name: 'Konto erstellen' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'bereits registriert' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Konto erstellen' })).toBeEnabled();

  await page.getByLabel('E-Mail').fill('available@matiq.local');
  await page.getByRole('button', { name: 'Konto erstellen' }).click();
  await expect(page).toHaveURL(/\/check-email\?email=available%40matiq\.local$/);
});
