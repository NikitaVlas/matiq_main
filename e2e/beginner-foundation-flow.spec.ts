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

const foundationItem = {
  id: 'foundation-movement',
  title: 'Grundbewegungen',
  recommendationType: 'GAP',
  completedAt: null,
  videos: [],
  progress: {
    completedVideos: 0,
    totalVideos: 0,
    percent: 0,
    status: 'NOT_STARTED',
  },
};

const assessmentItem = {
  id: 'assessment-top-control',
  title: 'Kontrolle von oben',
  recommendationType: 'GAP',
  completedAt: null,
  videos: [],
  progress: {
    completedVideos: 0,
    totalVideos: 0,
    percent: 0,
    status: 'NOT_STARTED',
  },
};

test('new white belt receives Foundation and can add Assessment recommendations later', async ({
  page,
}) => {
  let foundationAssigned = false;
  let assessmentCompleted = false;

  await page.route('http://localhost:4000/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (path === '/auth/login') return json(route, { ok: true });
    if (path === '/athlete-profile' && request.method() === 'PUT') {
      expect(request.postDataJSON()).toMatchObject({
        disciplines: ['BJJ_GI'],
        belt: 'WHITE',
        experienceMonths: 4,
        experienceYears: 0,
        trainingSessionsPerWeek: 2,
      });
      foundationAssigned = true;
      return json(route, { id: 'profile-1', foundationAssigned: true });
    }
    if (path === '/assessment/questions') {
      return json(route, [
        {
          key: 'top-confidence',
          text: 'Wie sicher arbeitest du von oben?',
          kind: 'CONFIDENCE',
          multiple: false,
          allowCustom: false,
          options: [{ key: 'rarely', label: 'Es gelingt selten' }],
        },
      ]);
    }
    if (path === '/assessment/answers') {
      return json(route, { completed: assessmentCompleted, answers: [] });
    }
    if (path === '/assessment/submit') {
      assessmentCompleted = true;
      return json(route, { roadmap: [foundationItem, assessmentItem] });
    }
    if (path === '/assessment/result') {
      const items = foundationAssigned
        ? [foundationItem, ...(assessmentCompleted ? [assessmentItem] : [])]
        : [];
      return json(route, {
        completed: assessmentCompleted,
        foundationActive: foundationAssigned,
        roadmaps: foundationAssigned
          ? [{ discipline: 'BJJ_GI', items, completedItems: [], hiddenItems: [] }]
          : [],
      });
    }
    if (path === '/subscription') {
      return json(route, { status: 'TRIAL', hasAccess: true, accessEndsAt: null });
    }
    if (path === '/content/history' || path === '/content/courses') return json(route, []);

    return json(route, {});
  });

  await page.goto('/login');
  await page.getByLabel('E-Mail').fill('beginner@matiq.local');
  await page.getByLabel('Passwort').fill('Test-password-123');
  await page.getByRole('button', { name: 'Anmelden' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto('/onboarding/profile');
  await page.getByLabel('BJJ Gi').check();
  await page.getByLabel('Gürtel').selectOption('WHITE');
  await page.getByLabel('Trainingserfahrung in Monaten').fill('4');
  await page.getByLabel('Trainings pro Woche').fill('2');
  await page.getByLabel('Allgemeine Entwicklung').check();
  await page.getByRole('button', { name: 'Profil speichern' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole('heading', { name: 'Konzentriere dich zuerst auf die Grundlagen' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Grundlagen starten' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Assessment trotzdem starten' })).toBeVisible();

  await page.getByRole('link', { name: 'Grundlagen starten' }).click();
  await expect(page.getByText('Grundbewegungen')).toBeVisible();
  await expect(
    page.getByText('Noch keine veröffentlichten Videos für dieses Thema.'),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Assessment trotzdem jederzeit starten' }).click();
  await page.getByLabel('Es gelingt selten').check();
  await page.getByRole('button', { name: 'Assessment abschließen' }).click();

  await expect(page.getByText('Grundbewegungen')).toBeVisible();
  await expect(page.getByText('Kontrolle von oben')).toBeVisible();
});
