'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SkillMap } from '../../features/roadmap/SkillMap';
import type { RoadmapItem } from '../../features/roadmap/skill-map';
import { userApiResponse } from '../../shared/api/client';

type Discipline = 'BJJ_GI' | 'NO_GI_GRAPPLING';
type Roadmap = {
  discipline: Discipline;
  items: RoadmapItem[];
  completedItems: RoadmapItem[];
  hiddenItems: RoadmapItem[];
};
type Result = { completed: boolean; foundationActive: boolean; roadmaps: Roadmap[] };

export default function RoadmapPage() {
  const [result, setResult] = useState<Result>();
  const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline>();
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState('');

  async function load() {
    const response = await userApiResponse('/assessment/result');
    if (!response.ok) throw new Error('ROADMAP_LOAD_FAILED');
    const value = (await response.json()) as Result;
    setResult(value);
    setSelectedDiscipline((current) => current ?? value.roadmaps[0]?.discipline);
  }

  useEffect(() => {
    void load().catch(() => setError('Die Roadmap konnte nicht geladen werden.'));
  }, []);

  async function update(id: string, body: object) {
    setError('');
    setUpdatingId(id);
    try {
      const response = await userApiResponse(`/assessment/roadmap-items/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error('ROADMAP_UPDATE_FAILED');
      await load();
    } catch {
      setError('Die Änderung konnte nicht gespeichert werden. Bitte versuche es erneut.');
    } finally {
      setUpdatingId('');
    }
  }

  const roadmap = result?.roadmaps.find((item) => item.discipline === selectedDiscipline);
  const visibleCount = (roadmap?.items.length ?? 0) + (roadmap?.completedItems.length ?? 0);
  const completedCount = roadmap?.completedItems.length ?? 0;

  return (
    <main className="skill-map-page">
      <section>
        <p className="eyebrow">Deine persönliche Roadmap</p>
        <header className="skill-page-header">
          <div>
            <h1>Dein Spiel. Deine Wege.</h1>
            <p>Ein Fokus für heute. Das ganze Spiel im Blick.</p>
          </div>
          {roadmap && visibleCount > 0 && (
            <div className="skill-overall">
              <strong>
                {completedCount}
                <span> / {visibleCount}</span>
              </strong>
              <p>Roadmap-Schritte abgeschlossen</p>
              <progress
                aria-label="Abgeschlossene Roadmap-Schritte"
                value={completedCount}
                max={visibleCount}
              />
            </div>
          )}
        </header>
        {!result && !error ? (
          <div className="roadmap-loading" role="status" aria-label="Roadmap wird geladen" />
        ) : null}
        {error ? (
          <div className="error" role="alert">
            <p>{error}</p>
            {!result && (
              <button
                onClick={() => {
                  setError('');
                  void load().catch(() => setError('Die Roadmap konnte nicht geladen werden.'));
                }}
              >
                Erneut versuchen
              </button>
            )}
          </div>
        ) : null}
        {result && !result.completed && !result.foundationActive ? (
          <p>
            Schließe zuerst dein <a href="/assessment">Assessment</a> ab.
          </p>
        ) : null}
        {result?.foundationActive && !result.completed ? (
          <p>
            Wir empfehlen dir, zuerst die Grundlagen zu trainieren. Du kannst dein{' '}
            <a href="/assessment">Assessment trotzdem jederzeit starten</a>.
          </p>
        ) : null}
        {result?.roadmaps.length ? (
          <nav className="roadmap-discipline-tabs" aria-label="Disziplin auswählen">
            {result.roadmaps.map((item) => (
              <button
                key={item.discipline}
                type="button"
                aria-pressed={item.discipline === selectedDiscipline}
                onClick={() => setSelectedDiscipline(item.discipline)}
              >
                {disciplineLabel(item.discipline)}
              </button>
            ))}
          </nav>
        ) : null}
        {roadmap && !visibleCount ? <p>Für diese Disziplin gibt es keine Empfehlungen.</p> : null}
        {roadmap && visibleCount > 0 && !roadmap.items.length ? (
          <p>Alle aktuellen Roadmap-Schritte sind abgeschlossen.</p>
        ) : null}
        {roadmap && visibleCount > 0 && (
          <SkillMap
            key={roadmap.discipline}
            items={roadmap.items}
            completed={roadmap.completedItems}
            updatingId={updatingId}
            update={update}
          />
        )}
        {roadmap && visibleCount > 0 && (
          <p className="skill-disclaimer">
            {completedCount} von {visibleCount} Roadmap-Schritten abgeschlossen. Das bedeutet nicht,
            dass eine Technik als gemeistert gilt.
          </p>
        )}
        {roadmap?.completedItems.length ? (
          <details className="skill-archive">
            <summary>Abgeschlossene Roadmap-Schritte · {roadmap.completedItems.length}</summary>
            <ul>
              {roadmap.completedItems.map((item) => (
                <li key={item.id}>
                  <Link href={`/roadmap/${item.id}`}>{item.title}</Link>
                  {item.completedAt && (
                    <span>
                      {' '}
                      · {new Intl.DateTimeFormat('de-DE').format(new Date(item.completedAt))}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
        {roadmap?.hiddenItems.length ? (
          <>
            <h2>Ausgeblendete Empfehlungen</h2>
            <div className="roadmap">
              {roadmap.hiddenItems.map((item) => (
                <article key={item.id}>
                  <strong>{item.title}</strong>
                  <button
                    disabled={Boolean(updatingId)}
                    onClick={() => update(item.id, { isHidden: false })}
                  >
                    {updatingId === item.id ? 'Wird gespeichert...' : 'Wiederherstellen'}
                  </button>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}

function disciplineLabel(discipline: Discipline) {
  return discipline === 'BJJ_GI' ? 'BJJ Gi' : 'No-Gi Grappling';
}
