import { expect, test, type Page } from '@playwright/test';
import { expectNoWcagViolations } from './wcag';

async function mock(
  page: Page,
  options: {
    status?: string;
    completed?: boolean;
    verified?: boolean;
    failLoad?: boolean;
    failAction?: boolean;
  } = {},
) {
  let status = options.status ?? 'NONE';
  let failLoad = options.failLoad ?? false;
  let failAction = options.failAction ?? false;
  let actions = 0;
  await page.route('http://localhost:4000/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const reply = (body: unknown, statusCode = 200) =>
      route.fulfill({
        status: statusCode,
        contentType: 'application/json',
        headers: {
          'access-control-allow-origin': 'http://localhost:3100',
          'access-control-allow-credentials': 'true',
          'access-control-allow-methods': 'GET, POST, OPTIONS',
          'access-control-allow-headers': 'content-type',
        },
        body: JSON.stringify(body),
      });
    if (req.method() === 'OPTIONS') return reply({});
    if (path === '/auth/me') return reply({ emailVerified: options.verified ?? true });
    if (path === '/assessment/answers') return reply({ completed: options.completed ?? true });
    if (path === '/subscription' && failLoad) {
      failLoad = false;
      return route.abort();
    }
    if (path === '/subscription')
      return reply({
        status,
        hasAccess: ['TRIAL', 'ACTIVE', 'CANCEL_AT_PERIOD_END'].includes(status),
        endsAt: '2099-10-01T00:00:00Z',
      });
    if (req.method() === 'POST') {
      actions++;
      if (failAction) {
        failAction = false;
        return reply({ message: 'internal provider details' }, 503);
      }
      if (path.endsWith('/activate-trial')) status = 'TRIAL';
      if (path.endsWith('/cancel')) status = 'CANCEL_AT_PERIOD_END';
      if (path.endsWith('/resume')) status = 'ACTIVE';
      return reply({ canceled: true, resumed: true, url: 'https://checkout.stripe.com/test' });
    }
    return reply({});
  });
  return { actions: () => actions };
}

test('load failure is announced and retry recovers; trial requires explicit activation', async ({
  page,
}) => {
  const state = await mock(page, { failLoad: true });
  await page.goto('/subscription');
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'Verbindung fehlgeschlagen',
  );
  await page.getByRole('button', { name: 'Status erneut laden' }).click();
  await expect(page.getByRole('button', { name: '7 Tage Trial starten' })).toBeVisible();
  expect(state.actions()).toBe(0);
  await expectNoWcagViolations(page);
  await page.getByRole('button', { name: '7 Tage Trial starten' }).click();
  await expect(page.getByText('Testphase', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '7 Tage Trial starten' })).toHaveCount(0);
  expect(state.actions()).toBe(1);
});

for (const [label, options] of [
  ['incomplete assessment', { completed: false }],
  ['unverified email', { verified: false }],
  ['expired trial', { status: 'EXPIRED' }],
] as const) {
  test(`does not offer trial for ${label}`, async ({ page }) => {
    await mock(page, options);
    await page.goto('/subscription');
    await expect(page.getByText('Status:', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: '7 Tage Trial starten' })).toHaveCount(0);
    if ('completed' in options)
      await expect(page.getByRole('link', { name: 'Assessment', exact: true })).toBeVisible();
  });
}

test('failed cancellation stays open and can be retried without exposing provider errors', async ({
  page,
}) => {
  await mock(page, { status: 'ACTIVE', failAction: true });
  await page.goto('/subscription');
  await page.getByRole('button', { name: 'Mitgliedschaft kündigen' }).click();
  await page.getByRole('button', { name: 'Kündigung bestätigen' }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'Die Anfrage ist fehlgeschlagen',
  );
  await expect(page.getByText('internal provider details')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Kündigung bestätigen' })).toBeEnabled();
  await page.getByRole('button', { name: 'Kündigung bestätigen' }).click();
  await expect(page.getByRole('button', { name: 'Mitgliedschaft fortsetzen' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Kündigung bestätigen' })).toHaveCount(0);
});

test('an unconfirmed cancellation is not shown as success', async ({ page }) => {
  await mock(page, { status: 'ACTIVE' });
  await page.route('**/subscription/cancel', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: {
        'access-control-allow-origin': 'http://localhost:3100',
        'access-control-allow-credentials': 'true',
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'content-type',
      },
      body: JSON.stringify({ canceled: false }),
    }),
  );
  await page.goto('/subscription');
  await page.getByRole('button', { name: 'Mitgliedschaft kündigen' }).click();
  await page.getByRole('button', { name: 'Kündigung bestätigen' }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('nicht bestätigt');
  await expect(page.getByRole('button', { name: 'Kündigung bestätigen' })).toBeEnabled();
});

test('checkout error is visible and consent controls remain usable', async ({ page }) => {
  await mock(page, { status: 'EXPIRED', failAction: true });
  await page.goto('/subscription');
  const pay = page.getByRole('button', { name: 'Für 15,00 € pro Monat bezahlen' });
  await expect(pay).toBeDisabled();
  await page.getByRole('checkbox').nth(0).check();
  await page.getByRole('checkbox').nth(1).check();
  await pay.click();
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  await expect(pay).toBeEnabled();
  await expect(page).toHaveURL(/subscription$/);
});

test('pending activation disables repeat actions and failed refresh can recover without reposting', async ({
  page,
}) => {
  const state = await mock(page);
  await page.goto('/subscription');
  const activate = page.getByRole('button', { name: '7 Tage Trial starten' });
  await expect(activate).toBeEnabled();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/subscription/activate-trial', async (route) => {
    await gate;
    await route.fallback();
  });
  await activate.click();
  await expect(activate).toBeDisabled();
  await expect(page.getByRole('status')).toBeVisible();
  await page.route('http://localhost:4000/subscription', (route) => route.abort());
  release();
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  await expect(activate).toHaveCount(0);
  expect(state.actions()).toBe(1);
  await page.unroute('http://localhost:4000/subscription');
  await page.getByRole('button', { name: 'Status erneut laden' }).click();
  await expect(page.getByText('Testphase', { exact: true })).toBeVisible();
  expect(state.actions()).toBe(1);
});
