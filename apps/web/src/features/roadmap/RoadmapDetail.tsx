'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { userApiResponse } from '../../shared/api/client';

type RoadmapDetailResult = {
  item: {
    id: string;
    title: string;
    discipline: 'BJJ_GI' | 'NO_GI_GRAPPLING';
    completedAt?: string | null;
  };
  progress: {
    completedLessons: number;
    totalLessons: number;
    requiredLessons: number;
    percent: number;
  };
  courses: Array<{ id: string; title: string; description?: string | null }>;
  lessons: Array<{
    videoId: string;
    title: string;
    durationSec?: number | null;
    watchedSeconds: number;
    completed: boolean;
    role: 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL';
    course: { id: string; title: string } | null;
    module: { id: string; title: string } | null;
  }>;
};

export default function RoadmapDetail({ id }: { id: string }) {
  const [result, setResult] = useState<RoadmapDetailResult>();
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  async function update(body: { completed?: boolean; isHidden?: boolean }) {
    setError('');
    setUpdating(true);
    try {
      const response = await userApiResponse(
        `/assessment/roadmap-items/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok) throw new Error('ROADMAP_UPDATE_FAILED');
      if (body.isHidden) return (window.location.href = '/roadmap');
      setResult((current) =>
        current
          ? {
              ...current,
              item: {
                ...current.item,
                completedAt: body.completed ? new Date().toISOString() : null,
              },
            }
          : current,
      );
    } catch {
      setError('Der Roadmap-Schritt konnte nicht aktualisiert werden.');
    } finally {
      setUpdating(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    userApiResponse(`/assessment/roadmap-items/${encodeURIComponent(id)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setResult((await response.json()) as RoadmapDetailResult);
      })
      .catch((loadError: Error) => {
        if (loadError.name !== 'AbortError')
          setError('Dieser Roadmap-Schritt ist nicht verfügbar.');
      });
    return () => controller.abort();
  }, [id]);

  if (error && !result)
    return (
      <main>
        <section className="shell">
          <p className="error" role="alert">
            {error}
          </p>
          <Link href="/roadmap">Zur Roadmap</Link>
        </section>
      </main>
    );
  if (!result)
    return (
      <main>
        <section className="shell">
          <div className="roadmap-detail-skeleton" aria-label="Roadmap-Schritt wird geladen">
            <span />
            <span />
            <span />
          </div>
        </section>
      </main>
    );

  const roleOrder = ['REQUIRED', 'RECOMMENDED', 'OPTIONAL'] as const;
  const groupedLessons = roleOrder.map((role) => ({
    role,
    lessons: result.lessons.filter((lesson) => lesson.role === role),
  }));
  const nextLesson = roleOrder
    .flatMap((role) => result.lessons.filter((lesson) => lesson.role === role))
    .find((lesson) => !lesson.completed);

  return (
    <main>
      <section className="shell roadmap-detail">
        <Link className="text-link" href="/roadmap">
          ← Zur Roadmap
        </Link>
        <div>
          <p className="eyebrow">Dein Entwicklungsschritt</p>
          <h1>{result.item.title}</h1>
          <p>
            {result.item.discipline === 'BJJ_GI' ? 'BJJ Gi' : 'No-Gi Grappling'} · Video-Fortschritt
            bedeutet nicht automatisch Beherrschung.
          </p>
        </div>
        <section className="roadmap-topic-progress" aria-labelledby="topic-progress-title">
          <div>
            <p className="eyebrow">Themenfortschritt</p>
            <h2 id="topic-progress-title">{result.progress.percent}% angesehen</h2>
            <p>
              {result.progress.completedLessons} von {result.progress.totalLessons} passenden
              Lektionen abgeschlossen.
            </p>
            {result.progress.requiredLessons ? <p>Gezählt werden nur Pflichtvideos.</p> : null}
          </div>
          <progress value={result.progress.percent} max="100">
            {result.progress.percent}%
          </progress>
        </section>
        {nextLesson ? (
          <Link className="action-link" href={`/video/${nextLesson.videoId}`}>
            Training fortsetzen: {nextLesson.title}
          </Link>
        ) : null}
        <div>
          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}
          <button
            disabled={updating}
            type="button"
            onClick={() => void update({ completed: !result.item.completedAt })}
          >
            {updating
              ? 'Wird gespeichert...'
              : result.item.completedAt
                ? 'Schritt wieder öffnen'
                : 'Schritt manuell abschließen'}
          </button>{' '}
          <button disabled={updating} type="button" onClick={() => void update({ isHidden: true })}>
            Empfehlung ausblenden
          </button>
        </div>
        {result.courses.length ? (
          <section aria-labelledby="matching-courses-title">
            <p className="eyebrow">Passende Kurse</p>
            <h2 id="matching-courses-title">Vertiefe das Thema im Kurs</h2>
            <div className="course-grid">
              {result.courses.map((course) => (
                <article className="course-card" key={course.id}>
                  <h3>
                    <Link href={`/courses/${course.id}`}>{course.title}</Link>
                  </h3>
                  <p>{course.description ?? 'Kurs mit passenden Lektionen für diesen Schritt.'}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}
        <section aria-labelledby="matching-lessons-title">
          <p className="eyebrow">Passende Lektionen</p>
          <h2 id="matching-lessons-title">Direkt mit einer Technik starten</h2>
          {result.lessons.length ? (
            groupedLessons.map((group) =>
              group.lessons.length ? (
                <div key={group.role}>
                  <h3>{roleLabel(group.role)}</h3>
                  <div className="roadmap-lesson-grid">
                    {group.lessons.map((lesson) => {
                      const percent = lesson.durationSec
                        ? Math.min(
                            100,
                            Math.round((lesson.watchedSeconds / lesson.durationSec) * 100),
                          )
                        : 0;
                      return (
                        <article key={lesson.videoId}>
                          <div>
                            <span>
                              {lesson.completed ? 'Abgeschlossen' : `${percent}% angesehen`}
                            </span>
                            <h3>{lesson.title}</h3>
                            <p>
                              {lesson.course
                                ? `${lesson.course.title} · ${lesson.module?.title}`
                                : 'Einzelvideo'}
                            </p>
                          </div>
                          <Link className="action-link" href={`/video/${lesson.videoId}`}>
                            {lesson.watchedSeconds ? 'Weiter ansehen' : 'Lektion starten'}
                          </Link>
                        </article>
                      );
                    })}
                  </div>
                </div>
              ) : null,
            )
          ) : (
            <div className="roadmap-empty-content">
              <h3>Noch keine passenden Lektionen veröffentlicht</h3>
              <p>
                Der Schritt wird automatisch ergänzt, sobald die Redaktion Inhalte mit diesem Thema
                verknüpft.
              </p>
              <Link href="/courses">Alle Kurse ansehen</Link>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function roleLabel(role: 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL') {
  return {
    REQUIRED: 'Pflichtvideos',
    RECOMMENDED: 'Empfohlene Videos',
    OPTIONAL: 'Optionale Vertiefung',
  }[role];
}
