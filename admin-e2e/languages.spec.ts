import { expect, test } from '@playwright/test';
import { expectNoWcagViolations } from '../e2e/wcag';
test('admin language persists across sections and keeps draft text intact', async ({ page }) => {
  let coursePayload: unknown;
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('http://localhost:4001/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === 'POST' && path === '/admin/content/courses')
      coursePayload = route.request().postDataJSON();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        path === '/admin/trainer-finance'
          ? { agreements: [], periods: [] }
          : path === '/admin/content/roadmap-diagnostics'
            ? { topics: [], unlinkedVideos: [] }
            : route.request().method() === 'POST'
              ? { id: 'course' }
              : [],
      ),
    });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'MATIQ Inhaltseditor' })).toBeVisible();
  const title = page.getByPlaceholder('Kurstitel (Deutsch)');
  await title.fill('Deutscher Kurstitel');
  await page.getByLabel('Sprache / Язык').selectOption('ru');
  await expect(page.getByRole('heading', { name: 'Редактор контента MATIQ' })).toBeVisible();
  await expect(page.getByPlaceholder('Название курса (на немецком)')).toHaveValue(
    'Deutscher Kurstitel',
  );
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await page.screenshot({ path: 'test-results/step2-admin-ru.png', fullPage: true });
  await page.getByRole('button', { name: 'Создать курс', exact: true }).click();
  await expect
    .poll(() => coursePayload)
    .toMatchObject({ title: 'Deutscher Kurstitel', discipline: 'NO_GI_GRAPPLING' });
  for (const [path, title] of [
    ['/videos', 'Загрузить видео с компьютера'],
    ['/assessment', 'Управление оценкой навыков'],
    ['/foundation', 'Базовый план для новичков'],
    ['/trainers', 'Спортивные профили тренеров'],
    ['/mfa', 'Редакция и управление'],
  ]) {
    await page.goto(path!);
    await expect(page.getByRole('heading', { name: title!, exact: true })).toBeVisible();
    await expect(page.getByLabel('Sprache / Язык')).toHaveValue('ru');
  }
  await expectNoWcagViolations(page);
  await page.getByLabel('Sprache / Язык').selectOption('de');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Redaktion und Verwaltung' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  expect(errors).toEqual([]);
});
