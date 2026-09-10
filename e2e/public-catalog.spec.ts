import { expect, test, type Page } from '@playwright/test';
import { expectNoWcagViolations } from './wcag';
const facet = (id: string, name: string) => [{ id, name }];
const videos = [
  {
    id: 'gi',
    title: 'Guard Sweep',
    description: 'Technik aus der Guard.',
    durationSec: 180,
    createdAt: '2026-09-01T00:00:00Z',
    disciplines: ['BJJ_GI'],
    trainer: { slug: 'lea', displayName: 'Lea Müller' },
    gameAreas: facet('ground', 'Boden'),
    positions: facet('guard', 'Guard'),
    skillGroups: facet('sweeps', 'Sweeps'),
    techniques: facet('sweep', 'Sweep'),
    movements: facet('hips', 'Hüftbewegung'),
    drills: facet('drill', 'Partnerdrill'),
  },
  {
    id: 'nogi',
    title: 'Stand im No-Gi',
    description: 'Kontrolle im Stand.',
    durationSec: 240,
    createdAt: '2026-09-02T00:00:00Z',
    disciplines: ['NO_GI_GRAPPLING'],
    trainer: { slug: 'tom', displayName: 'Tom Becker' },
    gameAreas: facet('standing', 'Stand'),
    positions: [],
    skillGroups: [],
    techniques: [],
    movements: [],
    drills: [],
  },
];
async function mock(page: Page, fail = false) {
  await page.route('http://localhost:4000/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/content/videos' && fail) {
      fail = false;
      return route.abort();
    }
    return route.fulfill({
      status: path.endsWith('/playback') ? 401 : 200,
      contentType: 'application/json',
      headers: {
        'access-control-allow-origin': 'http://localhost:3100',
        'access-control-allow-credentials': 'true',
      },
      body: JSON.stringify(
        path === '/content/videos'
          ? videos
          : path === '/content/trainers'
            ? [
                {
                  slug: 'lea',
                  displayName: 'Lea Müller',
                  biography: 'BJJ aus Berlin.',
                  city: 'Berlin',
                  disciplines: ['BJJ_GI'],
                  photoUrl: null,
                },
              ]
            : {},
      ),
    });
  });
}
test('public home presents videos, athletes and protected detail without a subscription', async ({
  page,
}) => {
  await mock(page);
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Entdecke dein nächstes Training.' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Guard Sweep' })).toBeVisible();
  await expectNoWcagViolations(page);
  await page.screenshot({ path: 'test-results/step2-home.png', fullPage: true });
  await page.getByRole('link', { name: 'Guard Sweep' }).click();
  await expect(page.getByRole('heading', { name: 'Guard Sweep' })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Registrieren und Testphase entdecken' }),
  ).toBeVisible();
  await expect(page.locator('video')).toHaveCount(0);
});
test('all eight filters combine, persist, reset and show no results on mobile', async ({
  page,
}) => {
  await mock(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/videos');
  for (const [label, value] of [
    ['Disziplin', 'BJJ_GI'],
    ['Trainer', 'lea'],
    ['Kampfbereich', 'ground'],
    ['Position', 'guard'],
    ['Technikgruppe', 'sweeps'],
    ['Technik', 'sweep'],
    ['Bewegung', 'hips'],
    ['Drill', 'drill'],
  ])
    await page.getByLabel(label!, { exact: true }).selectOption(value!);
  await expect(page.locator('.catalog-video-card')).toHaveCount(1);
  await page.reload();
  await expect(page.getByLabel('Trainer', { exact: true })).toHaveValue('lea');
  await expectNoWcagViolations(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/step2-catalog-mobile.png', fullPage: true });
  await page.getByLabel('Videos suchen').fill('unbekannt');
  await expect(page.getByRole('heading', { name: 'Keine passenden Videos' })).toBeVisible();
  await page.getByRole('button', { name: 'Filter zurücksetzen' }).click();
  await expect(page.locator('.catalog-video-card')).toHaveCount(2);
  expect(new URL(page.url()).search).toBe('');
});
test('catalog recovers from a network failure', async ({ page }) => {
  await mock(page, true);
  await page.goto('/videos');
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Erneut versuchen' }).click();
  await expect(page.locator('.catalog-video-card')).toHaveCount(2);
});
