import { expect, test, type Page } from '@playwright/test';
import { expectNoWcagViolations } from './wcag';
import {
  filterOptions,
  filterVideos,
  filterLabels,
  type CatalogVideo,
} from '../apps/web/src/features/catalog/catalog';
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
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path === '/auth/me') return route.fulfill({ json: { role: 'ATHLETE' } });
    if (path === '/content/video-page' && fail) {
      return route.abort();
    }
    if (path === '/content/videos')
      throw new Error('Public views must not request the full catalog');
    const filters = Object.fromEntries(
      Object.keys(filterLabels).map((key) => [key, url.searchParams.get(key) ?? '']),
    );
    const filtered = filterVideos(
      videos as CatalogVideo[],
      filters,
      url.searchParams.get('q') ?? '',
    ).filter((v) => !url.searchParams.has('id') || v.id === url.searchParams.get('id'));
    const pageNumber = Number(url.searchParams.get('page') ?? 1);
    const limit = Number(url.searchParams.get('limit') ?? 24);
    return route.fulfill({
      status: path.endsWith('/playback') ? 401 : 200,
      contentType: 'application/json',
      headers: {
        'access-control-allow-origin': 'http://localhost:3100',
        'access-control-allow-credentials': 'true',
      },
      body: JSON.stringify(
        path === '/content/video-page'
          ? {
              items: filtered.slice((pageNumber - 1) * limit, pageNumber * limit),
              total: filtered.length,
              page: pageNumber,
              limit,
            }
          : path === '/content/video-facets'
            ? Object.fromEntries(
                Object.keys(filterLabels).map((key) => [
                  key,
                  filterOptions(videos as CatalogVideo[], key as keyof typeof filterLabels),
                ]),
              )
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
  return () => {
    fail = false;
  };
}
test('signed-in home presents videos, athletes and protected detail without a subscription', async ({
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

test('pagination preserves query, handles back navigation and finds a later-page match', async ({
  page,
}) => {
  const catalog = Array.from({ length: 30 }, (_, i) => ({
    ...videos[0]!,
    id: `v-${i}`,
    title: `Guard ${i}`,
  }));
  await page.route('http://localhost:4000/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/auth/me') return route.fulfill({ json: { role: 'ATHLETE' } });
    if (url.pathname === '/content/video-facets')
      return route.fulfill({
        json: Object.fromEntries(
          Object.keys(filterLabels).map((key) => [
            key,
            filterOptions(catalog as CatalogVideo[], key as keyof typeof filterLabels),
          ]),
        ),
      });
    expect(url.pathname).toBe('/content/video-page');
    const matched = filterVideos(
      catalog as CatalogVideo[],
      { trainer: url.searchParams.get('trainer') ?? '' },
      url.searchParams.get('q') ?? '',
    );
    const current = Number(url.searchParams.get('page') ?? 1);
    return route.fulfill({
      json: {
        items: matched.slice((current - 1) * 24, current * 24),
        total: matched.length,
        page: current,
        limit: 24,
      },
    });
  });
  await page.goto('/videos?trainer=lea');
  await expect(page.locator('.catalog-video-card')).toHaveCount(24);
  await page.getByRole('button', { name: 'Nächste Seite' }).click();
  await expect(page.locator('.catalog-video-card')).toHaveCount(6);
  await expect(page).toHaveURL(/page=2.*trainer=lea/);
  await page.reload();
  await expect(page.locator('.catalog-video-card')).toHaveCount(6);
  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoWcagViolations(page);
  await page.screenshot({ path: 'test-results/catalog-pagination-mobile.png', fullPage: true });
  await page.goBack();
  await expect(page.locator('.catalog-video-card')).toHaveCount(24);
  await page.getByLabel('Videos suchen').fill('Guard 29');
  await expect(page.getByRole('link', { name: 'Guard 29', exact: true })).toBeVisible();
  await expect(page.locator('.catalog-video-card')).toHaveCount(1);
  await expect(page.getByLabel('Trainer', { exact: true })).toHaveValue('lea');
  await expectNoWcagViolations(page);
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
  const recover = await mock(page, true);
  await page.goto('/videos');
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  recover();
  await page.getByRole('button', { name: 'Erneut versuchen' }).click();
  await expect(page.locator('.catalog-video-card')).toHaveCount(2);
});

test('a slow stale search cannot replace newer results', async ({ page }) => {
  await mock(page);
  let release: () => void = () => {};
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  let started: () => void = () => {};
  const requested = new Promise<void>((resolve) => {
    started = resolve;
  });
  let finished: () => void = () => {};
  const delivered = new Promise<void>((resolve) => {
    finished = resolve;
  });
  await page.route('http://localhost:4000/content/video-page?*', async (route) => {
    const query = new URL(route.request().url()).searchParams.get('q');
    if (query !== 'slow') return route.fallback();
    started();
    await waiting;
    await route.fulfill({ json: { items: [videos[1]], total: 1, page: 1, limit: 24 } });
    finished();
  });
  await page.goto('/videos');
  await expect(page.locator('.catalog-video-card')).toHaveCount(2);
  await page.getByLabel('Videos suchen').fill('slow');
  await requested;
  await page.getByLabel('Videos suchen').fill('Guard Sweep');
  await expect(page.locator('.catalog-video-card')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Guard Sweep', exact: true })).toBeVisible();
  release();
  await delivered;
  await expect(page.getByRole('link', { name: 'Stand im No-Gi', exact: true })).toHaveCount(0);
});

test('facet failure is visible and can be retried', async ({ page }) => {
  await mock(page);
  let failed = true;
  const recover = () => {
    failed = false;
  };
  await page.route('http://localhost:4000/content/video-facets', (route) =>
    failed ? route.abort() : route.fallback(),
  );
  await page.goto('/videos');
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  recover();
  await page.getByRole('button', { name: 'Erneut versuchen' }).click();
  await expect(
    page.getByLabel('Trainer', { exact: true }).getByRole('option', { name: 'Lea Müller' }),
  ).toHaveCount(1);
  await expect(page.locator('.catalog-video-card')).toHaveCount(2);
});

test('an out-of-range bookmarked page can return to the catalog', async ({ page }) => {
  await mock(page);
  await page.goto('/videos?page=999');
  await expect(page.getByRole('heading', { name: 'Keine passenden Videos' })).toBeVisible();
  await page.getByRole('button', { name: 'Filter zurücksetzen' }).click();
  await expect(page.locator('.catalog-video-card')).toHaveCount(2);
  expect(new URL(page.url()).search).toBe('');
});

for (const unavailable of ['guest', 'network failure', 'pending'] as const) {
  test(`video catalogue stays hidden for ${unavailable}`, async ({ page }) => {
    await mock(page);
    const catalogRequests: string[] = [];
    page.on('request', (request) => {
      if (/content\/video-(page|facets)/.test(request.url())) catalogRequests.push(request.url());
    });
    await page.route('http://localhost:4000/auth/me', async (route) => {
      if (unavailable === 'network failure') return route.abort();
      if (unavailable === 'pending') {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      return route.fulfill({ status: 401, json: {} });
    });
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Entdecke dein nächstes Training.' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Videos entdecken' })).toHaveCount(0);
    await expect(page.locator('.catalog-video-card')).toHaveCount(0);
    await expect(
      page.getByRole('navigation').getByRole('link', { name: 'Videos', exact: true }),
    ).toHaveCount(0);
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Dashboard' })).toHaveCount(
      0,
    );
    await expect(page.getByRole('link', { name: 'Kostenlos registrieren' })).toBeVisible();
    await page.goto('/videos?trainer=lea');
    await expect(page.locator('.catalog-video-card')).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'Melde dich an, um Videos zu entdecken.' }),
    ).toBeVisible();
    await expect(
      page.getByRole('main').getByRole('link', { name: 'Anmelden', exact: true }),
    ).toHaveAttribute('href', '/login');
    await expectNoWcagViolations(page);
    expect(catalogRequests).toEqual([]);
  });
}
