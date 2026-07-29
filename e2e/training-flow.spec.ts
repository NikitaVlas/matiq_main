import { expect, test, type Route } from '@playwright/test';

const question = {
  key: 'top-confidence',
  text: 'Wie sicher arbeitest du von oben?',
  kind: 'CONFIDENCE',
  multiple: false,
  allowCustom: false,
  options: [
    { key: 'rarely', label: 'Es gelingt selten' },
    { key: 'secure', label: 'Ich kontrolliere sicher' },
  ],
};

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

test('athlete completes assessment, opens a roadmap lesson, and updates progress', async ({
  page,
}) => {
  let lessonCompleted = false;

  await page.route('http://localhost:4000/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (path === '/auth/login') return json(route, { ok: true });
    if (path === '/assessment/questions') return json(route, [question]);
    if (path === '/assessment/answers') return json(route, { completed: false, answers: [] });
    if (path === '/assessment/submit') {
      expect(request.postDataJSON()).toEqual({
        answers: [{ questionKey: question.key, optionKey: 'rarely' }],
      });
      return json(route, {
        roadmap: [{ id: 'roadmap-1', title: 'Kontrolle von oben', recommendationType: 'GAP' }],
      });
    }
    if (path === '/assessment/roadmap-items/roadmap-1') {
      return json(route, {
        item: {
          id: 'roadmap-1',
          title: 'Kontrolle von oben',
          discipline: 'BJJ_GI',
          completedAt: lessonCompleted ? new Date().toISOString() : null,
        },
        progress: {
          completedLessons: lessonCompleted ? 1 : 0,
          totalLessons: 1,
          requiredLessons: 1,
          percent: lessonCompleted ? 100 : 0,
        },
        courses: [{ id: 'course-1', title: 'Top Game', description: 'Kontrolle aufbauen' }],
        lessons: [
          {
            videoId: 'video-1',
            title: 'Pressure halten',
            durationSec: 100,
            watchedSeconds: lessonCompleted ? 100 : 0,
            completed: lessonCompleted,
            role: 'REQUIRED',
            course: { id: 'course-1', title: 'Top Game' },
            module: { id: 'module-1', title: 'Kontrolle' },
          },
        ],
      });
    }
    if (path === '/content/videos/video-1/playback') {
      return json(route, {
        video: {
          id: 'video-1',
          title: 'Pressure halten',
          description: 'Stabile Kontrolle aus der Top Position.',
          durationSec: 100,
          status: 'PUBLISHED',
          metadataValues: [],
        },
        playbackUrl: 'data:video/mp4;base64,',
        watchedSeconds: 0,
        courseContext: null,
      });
    }
    if (path === '/content/videos/video-1/recommendations') {
      return json(route, {
        primarySource: null,
        roadmap: null,
        lessonPath: null,
        metadataFallback: null,
      });
    }
    if (path === '/content/videos/video-1/watch') {
      expect(request.postDataJSON()).toEqual({ watchedSeconds: 100 });
      lessonCompleted = true;
      return json(route, {
        watchedSeconds: 100,
        completed: true,
        newlyCompleted: true,
        roadmapItemsCompleted: 1,
      });
    }
    if (path === '/assessment/result') {
      const item = {
        id: 'roadmap-1',
        title: 'Kontrolle von oben',
        completedAt: lessonCompleted ? new Date().toISOString() : null,
        recommendationType: 'GAP',
        videos: [{ id: 'video-1', title: 'Pressure halten' }],
        progress: {
          completedVideos: lessonCompleted ? 1 : 0,
          totalVideos: 1,
          percent: lessonCompleted ? 100 : 0,
          status: lessonCompleted ? 'COMPLETED' : 'NOT_STARTED',
        },
      };
      return json(route, {
        completed: true,
        roadmaps: [
          {
            discipline: 'BJJ_GI',
            items: lessonCompleted ? [] : [item],
            completedItems: lessonCompleted ? [item] : [],
            hiddenItems: [],
          },
        ],
      });
    }

    return json(route, {});
  });

  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.getByLabel('E-Mail').fill('athlete@matiq.local');
  await page.getByLabel('Passwort').fill('Test-password-123');
  await page.getByRole('button', { name: 'Anmelden' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto('/assessment');
  await page.getByLabel('Es gelingt selten').check();
  await page.getByRole('button', { name: 'Assessment abschließen' }).click();
  await expect(
    page.getByRole('heading', { name: 'Dein nächster Entwicklungsschritt' }),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Kontrolle von oben' }).click();
  await expect(page.getByRole('heading', { name: 'Kontrolle von oben' })).toBeVisible();
  await page.getByRole('link', { name: 'Lektion starten' }).click();
  await expect(page.getByRole('heading', { name: 'Pressure halten' })).toBeVisible();

  await page.locator('video').evaluate((video) => {
    Object.defineProperty(video, 'currentTime', { configurable: true, value: 100 });
    video.dispatchEvent(new Event('ended'));
  });
  await expect(page.getByRole('heading', { name: 'Lektion abgeschlossen' })).toBeVisible();
  await expect(page.getByText('1 Roadmap-Schritt wurde abgeschlossen.')).toBeVisible();

  await page.goto('/roadmap');
  await expect(page.getByText('1 von 1 Roadmap-Schritten abgeschlossen.')).toBeVisible();
  await expect(page.getByText('Abgeschlossene Roadmap-Schritte')).toBeVisible();
});
