'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const api = process.env.NEXT_PUBLIC_USER_API_URL ?? 'http://localhost:4000';

type Discipline = 'BJJ_GI' | 'NO_GI_GRAPPLING';
type RecommendationType = 'CORE' | 'GAP' | 'EXPLORE';
type ProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
type RoadmapItem = {
  id: string;
  title: string;
  completedAt?: string | null;
  recommendationType: RecommendationType;
  videos?: { id: string; title: string }[];
  progress?: {
    completedVideos: number;
    totalVideos: number;
    percent: number;
    status: ProgressStatus;
  };
};
type Roadmap = {
  discipline: Discipline;
  items: RoadmapItem[];
  completedItems: RoadmapItem[];
  hiddenItems: RoadmapItem[];
};
type Result = { completed: boolean; roadmaps: Roadmap[] };

export default function RoadmapPage() {
  const [result, setResult] = useState<Result>();
  const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline>();
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState('');

  async function load() {
    const response = await fetch(`${api}/assessment/result`, { credentials: 'include' });
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
      const response = await fetch(`${api}/assessment/roadmap-items/${id}`, {
        method: 'PATCH',
        credentials: 'include',
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
  const sections = roadmap
    ? (['GAP', 'CORE', 'EXPLORE'] as const).map((type) => ({
        type,
        items: roadmap.items.filter((item) => item.recommendationType === type),
      }))
    : [];

  return (
    <main>
      <section className="shell">
        <p className="eyebrow">Roadmap</p>
        <h1>DEIN NÄCHSTER SCHRITT</h1>
        {!result && !error ? (
          <div className="roadmap-loading" aria-label="Roadmap wird geladen" />
        ) : null}
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        {result && !result.completed ? (
          <p>
            Schließe zuerst dein <a href="/assessment">Assessment</a> ab.
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
        {roadmap && visibleCount ? (
          <p>
            {completedCount} von {visibleCount} Roadmap-Schritten abgeschlossen. Das bedeutet nicht,
            dass eine Technik als gemeistert gilt.
          </p>
        ) : null}

        {sections.map((section) =>
          section.items.length ? (
            <section key={section.type} aria-labelledby={`roadmap-${section.type}`}>
              <p className="eyebrow">{sectionLabel(section.type)}</p>
              <h2 id={`roadmap-${section.type}`}>{sectionTitle(section.type)}</h2>
              <p>{sectionDescription(section.type)}</p>
              <div className="roadmap">
                {section.items.map((item, index) => (
                  <article key={item.id}>
                    {section.type === 'GAP' && index === 0 ? (
                      <p className="eyebrow">Als Nächstes</p>
                    ) : null}
                    <Link className="roadmap-title-link" href={`/roadmap/${item.id}`}>
                      <strong>{item.title}</strong>
                    </Link>
                    <RoadmapProgress item={item} />
                    {item.videos?.map((video) => (
                      <a key={video.id} href={`/video/${video.id}`}>
                        {video.title}
                      </a>
                    ))}
                    <div className="roadmap-item-actions">
                      <button
                        disabled={Boolean(updatingId)}
                        aria-label={`${item.title} nach oben verschieben`}
                        onClick={() => update(item.id, { direction: 'up' })}
                      >
                        ↑
                      </button>
                      <button
                        disabled={Boolean(updatingId)}
                        aria-label={`${item.title} nach unten verschieben`}
                        onClick={() => update(item.id, { direction: 'down' })}
                      >
                        ↓
                      </button>
                      <button
                        disabled={Boolean(updatingId)}
                        onClick={() => update(item.id, { isHidden: true })}
                      >
                        {updatingId === item.id ? 'Wird gespeichert...' : 'Ausblenden'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null,
        )}

        {roadmap?.completedItems.length ? (
          <>
            <h2>Abgeschlossene Roadmap-Schritte</h2>
            <div className="roadmap">
              {roadmap.completedItems.map((item) => (
                <article key={item.id}>
                  <Link className="roadmap-title-link" href={`/roadmap/${item.id}`}>
                    <strong>{item.title}</strong>
                  </Link>
                  <p>
                    Abgeschlossen am{' '}
                    {item.completedAt
                      ? new Intl.DateTimeFormat('de-DE').format(new Date(item.completedAt))
                      : ''}
                  </p>
                  <RoadmapProgress item={item} />
                </article>
              ))}
            </div>
          </>
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

function RoadmapProgress({ item }: { item: RoadmapItem }) {
  const progress = item.progress;
  if (!progress?.totalVideos) return <p>Noch keine veröffentlichten Videos für dieses Thema.</p>;
  return (
    <div aria-label={`Fortschritt ${progress.percent} Prozent`}>
      <progress max={100} value={progress.percent} />
      <p>
        {progress.completedVideos} von {progress.totalVideos} Videos abgeschlossen.{' '}
        {progressStatusLabel(progress.status)}
      </p>
    </div>
  );
}

function disciplineLabel(discipline: Discipline) {
  return discipline === 'BJJ_GI' ? 'BJJ Gi' : 'No-Gi Grappling';
}

function sectionLabel(type: RecommendationType) {
  return { GAP: 'Entwicklung', CORE: 'Dein Spiel', EXPLORE: 'Entdecken' }[type];
}

function sectionTitle(type: RecommendationType) {
  return {
    GAP: 'Aktuelle Entwicklungslücken',
    CORE: 'Stärken weiter ausbauen',
    EXPLORE: 'Neue Ziele erkunden',
  }[type];
}

function sectionDescription(type: RecommendationType) {
  return {
    GAP: 'Diese Themen blockieren aktuell deinen nächsten Entwicklungsschritt.',
    CORE: 'Diese Positionen und Techniken gehören bereits zu deinem bevorzugten Spiel.',
    EXPLORE: 'Diese Themen hast du als nächste Entwicklungsrichtung ausgewählt.',
  }[type];
}

function progressStatusLabel(status: ProgressStatus) {
  return {
    NOT_STARTED: 'Noch nicht begonnen',
    IN_PROGRESS: 'In Bearbeitung',
    COMPLETED: 'Abgeschlossen',
  }[status];
}
