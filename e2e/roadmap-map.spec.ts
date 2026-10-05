import { expect, test, type Page } from '@playwright/test';
import { expectNoWcagViolations } from './wcag';

const skills = [
  ['open-guard', 'Offene Guard', 'GAP'],
  ['standing', 'Stand & Takedowns', 'GAP'],
  ['top-control', 'Kontrolle von oben', 'CORE'],
  ['mount-top', 'Mount-Kontrolle', 'GAP'],
  ['side-control-top', 'Side-Control-Kontrolle', 'CORE'],
  ['closed-guard', 'Geschlossene Guard', 'CORE'],
  ['bottom-escape', 'Escapes von unten', 'GAP'],
  ['mount-bottom', 'Mount-Escapes', 'EXPLORE'],
] as const;
const fixture = () =>
  skills.map(([skillKey, title, recommendationType], i) => ({
    id: `step-${i}`,
    skillKey,
    title,
    recommendationType,
    videos: [{ id: `video-${i}`, title: `Training: ${title}` }],
    progress: {
      completedVideos: i === 0 ? 1 : 0,
      totalVideos: 3,
      percent: i === 0 ? 33 : 0,
      status: i === 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
    },
  }));

async function mock(page: Page, failedUpdate = false) {
  let items = fixture();
  const hidden: ReturnType<typeof fixture> = [];
  await page.route('http://localhost:4000/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/auth/me') return route.fulfill({ json: { role: 'ATHLETE' } });
    if (path.startsWith('/assessment/roadmap-items/')) {
      if (failedUpdate) return route.fulfill({ status: 500, json: {} });
      const id = path.split('/').at(-1);
      const change = route.request().postDataJSON();
      if (change.isHidden === true) {
        hidden.push(items.find((item) => item.id === id)!);
        items = items.filter((item) => item.id !== id);
      } else if (change.isHidden === false) {
        items.push(
          hidden.splice(
            hidden.findIndex((item) => item.id === id),
            1,
          )[0]!,
        );
      } else {
        const index = items.findIndex((item) => item.id === id);
        const target = change.direction === 'up' ? index - 1 : index + 1;
        if (target >= 0 && target < items.length)
          [items[index], items[target]] = [items[target]!, items[index]!];
      }
      return route.fulfill({ json: { ok: true } });
    }
    if (path === '/assessment/result')
      return route.fulfill({
        json: {
          completed: true,
          foundationActive: false,
          roadmaps: [
            { discipline: 'BJJ_GI', items, completedItems: [], hiddenItems: hidden },
            {
              discipline: 'NO_GI_GRAPPLING',
              items: [],
              completedItems: [
                {
                  ...fixture()[0],
                  id: 'no-gi-done',
                  title: 'No-Gi Guard',
                  completedAt: '2026-10-01T10:00:00Z',
                  progress: {
                    completedVideos: 3,
                    totalVideos: 3,
                    percent: 100,
                    status: 'COMPLETED',
                  },
                },
              ],
              hiddenItems: [],
            },
          ],
        },
      });
    return route.fulfill({ json: {} });
  });
}

test('map shows branches, now/next/later, selection, materials and discipline progress', async ({
  page,
}) => {
  await mock(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/roadmap');
  await expect(page.locator('.skill-node')).toHaveCount(8);
  await expect(page.locator('.skill-node.is-now')).toContainText('Offene Guard');
  await expect(page.locator('.skill-node.is-next')).toHaveCount(2);
  await expect(page.locator('.skill-node.is-later')).toHaveCount(5);
  await expect(page.getByRole('heading', { name: 'Top Game', exact: true })).toBeVisible();
  await expectNoWcagViolations(page);
  await page.screenshot({ path: 'test-results/roadmap-map-desktop.png', fullPage: true });
  await page
    .locator('.skill-map-legend')
    .getByRole('button', { name: 'Später', exact: true })
    .click();
  await expect(page.locator('.skill-node.is-muted')).toHaveCount(3);
  const mount = page.locator('.skill-node').filter({ hasText: 'Mount-Kontrolle' });
  await mount.focus();
  await page.keyboard.press('Enter');
  await expect(mount).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.locator('#skill-detail').getByRole('heading', { name: 'Mount-Kontrolle', exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('#skill-detail').getByRole('link', { name: 'Skill und Materialien ansehen' }),
  ).toHaveAttribute('href', '/roadmap/step-3');
  await page.getByRole('button', { name: 'No-Gi Grappling', exact: true }).click();
  await expect(page.locator('.skill-node')).toHaveCount(1);
  await expect(page.locator('.skill-node.is-completed')).toContainText('No-Gi Guard');
  await expect(page.getByText('Alle aktuellen Roadmap-Schritte sind abgeschlossen.')).toBeVisible();
});

test('mobile map keeps nodes reachable and preserves hide, restore and reorder', async ({
  page,
}) => {
  await mock(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/roadmap');
  const standing = page.locator('.skill-node').filter({ hasText: 'Stand & Takedowns' });
  await standing.click();
  await page.getByRole('button', { name: 'Stand & Takedowns nach oben verschieben' }).click();
  await expect(standing).toHaveClass(/is-now/);
  await page
    .locator('#skill-detail')
    .getByRole('button', { name: 'Ausblenden', exact: true })
    .click();
  await expect(page.locator('.skill-node')).toHaveCount(7);
  await page.getByRole('button', { name: 'Wiederherstellen' }).click();
  await expect(page.locator('.skill-node')).toHaveCount(8);
  await page.locator('.skill-node').filter({ hasText: 'Mount-Escapes' }).click();
  await expect(
    page.locator('#skill-detail').getByRole('heading', { name: 'Mount-Escapes', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await expectNoWcagViolations(page);
  await page.screenshot({ path: 'test-results/roadmap-map-mobile.png', fullPage: true });
});

test('failed update preserves the map and allows another attempt', async ({ page }) => {
  await mock(page, true);
  await page.goto('/roadmap');
  await page.locator('#skill-detail').getByRole('button', { name: 'Ausblenden' }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('nicht gespeichert');
  await expect(page.locator('.skill-node')).toHaveCount(8);
  await expect(
    page.locator('#skill-detail').getByRole('button', { name: 'Ausblenden' }),
  ).toBeEnabled();
});

test('load failure can be retried and an empty roadmap stays usable', async ({ page }) => {
  await mock(page);
  let failed = true;
  await page.route('http://localhost:4000/assessment/result', (route) =>
    route.fulfill({
      status: failed ? 503 : 200,
      json: failed
        ? {}
        : {
            completed: true,
            foundationActive: false,
            roadmaps: [{ discipline: 'BJJ_GI', items: [], completedItems: [], hiddenItems: [] }],
          },
    }),
  );
  await page.goto('/roadmap');
  await expect(page.getByRole('main').getByRole('alert')).toContainText('nicht geladen');
  failed = false;
  await page.getByRole('button', { name: 'Erneut versuchen' }).click();
  await expect(page.getByText('Für diese Disziplin gibt es keine Empfehlungen.')).toBeVisible();
  await expect(page.locator('.skill-node')).toHaveCount(0);
});

test('unpublished materials, foundation and unknown skills remain visible', async ({ page }) => {
  await mock(page);
  await page.route('http://localhost:4000/assessment/result', (route) =>
    route.fulfill({
      json: {
        completed: true,
        foundationActive: true,
        roadmaps: [
          {
            discipline: 'BJJ_GI',
            completedItems: [],
            hiddenItems: [],
            items: [
              ...fixture().map((item) => ({
                ...item,
                videos: [],
                progress: { completedVideos: 0, totalVideos: 0, percent: 0, status: 'NOT_STARTED' },
              })),
              {
                id: 'base',
                title: 'Bewegungsgrundlagen',
                source: 'FOUNDATION',
                skillKey: 'base',
                recommendationType: 'GAP',
              },
              {
                id: 'new',
                title: 'Neuer Skill',
                skillKey: 'new-key',
                recommendationType: 'EXPLORE',
              },
            ],
          },
        ],
      },
    }),
  );
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto('/roadmap');
  await expect(page.locator('.skill-node')).toHaveCount(10);
  await expect(page.locator('#skill-detail')).toContainText('Noch keine veröffentlichten Videos');
  await expect(
    page.locator('#skill-detail').getByRole('link', { name: 'Training starten' }),
  ).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Grundlagen', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Weitere Skills', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await expectNoWcagViolations(page);
});
