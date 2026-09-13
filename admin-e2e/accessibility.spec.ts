import { expect, test } from '@playwright/test';
import { expectNoWcagViolations } from '../e2e/wcag';

for (const language of ['de', 'ru']) {
  for (const path of ['/', '/videos', '/assessment', '/foundation', '/trainers', '/mfa']) {
    test(`${language} ${path} has named controls and reflows at 320 CSS pixels`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await page.addInitScript(
        (value) => localStorage.setItem('matiq-admin-language', value),
        language,
      );
      await page.route('http://localhost:4001/**', (route) => {
        const url = new URL(route.request().url()).pathname;
        if (url === '/admin/content/courses') {
          return route.fulfill({
            status: 200,
            json: [
              {
                id: 'course',
                key: 'basics',
                title: 'Grundlagen',
                published: false,
                modules: [{ id: 'module', title: 'Guard', position: 0, lessons: [] }],
              },
            ],
          });
        }
        const body =
          url === '/admin/trainer-finance'
            ? { agreements: [], periods: [] }
            : url === '/admin/content/roadmap-diagnostics'
              ? { topics: [], unlinkedVideos: [] }
              : url === '/admin/assessment/foundation-templates'
                ? [
                    {
                      id: 'f',
                      name: 'Foundation',
                      discipline: 'BJJ_GI',
                      active: true,
                      minExperienceMonths: 0,
                      maxExperienceMonths: 6,
                      steps: [
                        {
                          id: 's',
                          key: 'guard',
                          title: 'Geschlossene Guard',
                          skillKey: 'guard',
                          position: 0,
                          active: true,
                        },
                      ],
                    },
                  ]
                : url === '/admin/content/roadmap-topic-coverage'
                  ? [{ id: 'g', key: 'guard', name: 'Guard', publishedVideoCount: 1 }]
                  : [];
        return route.fulfill({ status: 200, json: body });
      });
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('lang', language);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await page.keyboard.press('Tab');
      await expect(page.locator('.skip-link')).toBeFocused();
      expect(
        await page.locator('.skip-link').evaluate((node) => node.getBoundingClientRect().top),
      ).toBeGreaterThanOrEqual(0);
      await page.keyboard.press('Enter');
      await expect(page.locator('#main-content')).toBeFocused();
      if (path === '/')
        await page
          .getByRole('button', {
            name: language === 'ru' ? 'Открыть редактор курса' : 'Kurseditor öffnen',
            exact: true,
          })
          .click();
      if (path === '/assessment') {
        await page
          .locator('select')
          .filter({ has: page.locator('option[value="PREFERENCE"]') })
          .selectOption('PREFERENCE');
      }
      if (path === '/foundation')
        await expect(page.getByRole('heading', { name: /Foundation ·/ })).toBeVisible();
      await expectNoWcagViolations(page);
      const unnamed = await page.locator('input,select,textarea').evaluateAll((nodes) =>
        nodes
          .filter((node) => {
            const control = node as HTMLInputElement;
            return (
              control.type !== 'hidden' &&
              !control.labels?.length &&
              !control.getAttribute('aria-label') &&
              !control.getAttribute('aria-labelledby')
            );
          })
          .map((node) => node.outerHTML),
      );
      expect(unnamed).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if (path === '/foundation' && language === 'ru') {
        await page.locator('#main-content').blur();
        await page.evaluate(() => window.scrollTo(0, 0));
        expect(
          await page.locator('.skip-link').evaluate((node) => node.getBoundingClientRect().bottom),
        ).toBeLessThanOrEqual(0);
        await page.screenshot({ path: 'test-results/foundation-ru-mobile.png', fullPage: true });
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.screenshot({ path: 'test-results/foundation-ru-desktop.png', fullPage: true });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
      }
    });
  }
}
