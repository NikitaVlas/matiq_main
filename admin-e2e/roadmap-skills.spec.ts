import { expect, test } from '@playwright/test';

test('editor creates a nested skill and can change its parent', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('matiq-admin-language', 'ru'));
  const topics = [
    {
      id: 'open',
      key: 'open-guard',
      name: 'Offene Guard',
      parentId: null as string | null,
      publishedVideoCount: 0,
    },
  ];
  let created: unknown;
  let linked: unknown;
  await page.route('http://localhost:4001/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/admin/content/roadmap-topics' && route.request().method() === 'POST') {
      created = route.request().postDataJSON();
      topics.push({ ...route.request().postDataJSON(), id: 'lasso', publishedVideoCount: 0 });
      return route.fulfill({ json: topics[1] });
    }
    if (path === '/admin/content/roadmap-topics/lasso') {
      linked = route.request().postDataJSON();
      topics[1]!.parentId = route.request().postDataJSON().parentId;
      return route.fulfill({ json: topics[1] });
    }
    return route.fulfill({
      json:
        path === '/admin/content/roadmap-topic-coverage'
          ? topics
          : path === '/admin/content/metadata-fields'
            ? [{ id: 'topic-field', key: 'roadmap-topic', name: 'Roadmap-Thema', options: topics }]
            : path === '/admin/content/roadmap-diagnostics'
              ? { topics: [], unlinkedVideos: [] }
              : [],
    });
  });
  await page.goto('/videos');
  await page.getByLabel('Новая тема плана', { exact: true }).fill('Lasso Guard');
  await page.getByLabel('Родительское направление Roadmap', { exact: true }).selectOption('open');
  await page.getByRole('button', { name: 'Добавить тему плана', exact: true }).click();
  await expect(page.getByLabel('Родительское направление Roadmap: Lasso Guard')).toHaveValue(
    'open',
  );
  expect(created).toEqual({ key: 'lasso-guard', name: 'Lasso Guard', parentId: 'open' });
  await expect(page.getByLabel('Родительское направление Roadmap: Offene Guard')).toBeDisabled();
  await page.getByLabel('Родительское направление Roadmap: Lasso Guard').selectOption('');
  await page
    .locator('li')
    .filter({ has: page.getByLabel('Родительское направление Roadmap: Lasso Guard') })
    .getByRole('button', { name: 'Сохранить связь навыка' })
    .click();
  await expect(page.getByLabel('Родительское направление Roadmap: Lasso Guard')).toHaveValue('');
  await expect(page.getByText('Связь навыка сохранена.', { exact: true })).toBeVisible();
  expect(linked).toEqual({ parentId: null });
});
