'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { selectRoadmapFocus } from '../../features/roadmap/roadmap-focus';

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
  const focus = selectRoadmapFocus(roadmap?.items ?? []);

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

        {focus.primary ? (
          <section className="roadmap-focus" aria-labelledby="roadmap-focus-title">
            <p className="eyebrow">Jetzt trainieren</p>
            <h2 id="roadmap-focus-title">Dein aktueller Fokus</h2>
            <p>
              Konzentriere dich zuerst auf dieses Thema. Die weiteren Ergebnisse bleiben erhalten.
            </p>
            <div className="roadmap">
              <RoadmapCard item={focus.primary} primary updatingId={updatingId} update={update} />
            </div>
          </section>
        ) : null}

        {focus.next.length ? (
          <section aria-labelledby="roadmap-next-title">
            <p className="eyebrow">Danach</p>
            <h2 id="roadmap-next-title">Deine nächsten Richtungen</h2>
            <p>Diese Themen folgen, sobald du mit deinem aktuellen Fokus weitergekommen bist.</p>
            <div className="roadmap">
              {focus.next.map((item) => (
                <RoadmapCard key={item.id} item={item} updatingId={updatingId} update={update} />
              ))}
            </div>
          </section>
        ) : null}

        {focus.backlog.length ? (
          <details className="roadmap-backlog">
            <summary>Später bearbeiten · {focus.backlog.length} weitere Themen</summary>
            <p>Diese Ergebnisse sind gespeichert, aber momentan nicht Teil deines aktiven Plans.</p>
            <div className="roadmap">
              {focus.backlog.map((item) => (
                <RoadmapCard key={item.id} item={item} updatingId={updatingId} update={update} />
              ))}
            </div>
          </details>
        ) : null}

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

function RoadmapCard({
  item,
  primary = false,
  updatingId,
  update,
}: {
  item: RoadmapItem;
  primary?: boolean;
  updatingId: string;
  update: (id: string, body: object) => Promise<void>;
}) {
  return (
    <article className={primary ? 'is-primary' : undefined}>
      <p className="roadmap-type">{recommendationLabel(item.recommendationType)}</p>
      <Link className="roadmap-title-link" href={`/roadmap/${item.id}`}>
        <strong>{item.title}</strong>
      </Link>
      <RoadmapProgress item={item} />
      {primary && item.videos?.[0] ? (
        <Link className="action-link" href={`/video/${item.videos[0].id}`}>
          Training starten
        </Link>
      ) : null}
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
        <button disabled={Boolean(updatingId)} onClick={() => update(item.id, { isHidden: true })}>
          {updatingId === item.id ? 'Wird gespeichert...' : 'Ausblenden'}
        </button>
      </div>
    </article>
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

function recommendationLabel(type: RecommendationType) {
  return { GAP: 'Entwicklung', CORE: 'Dein Spiel', EXPLORE: 'Neues Ziel' }[type];
}

function progressStatusLabel(status: ProgressStatus) {
  return {
    NOT_STARTED: 'Noch nicht begonnen',
    IN_PROGRESS: 'In Bearbeitung',
    COMPLETED: 'Abgeschlossen',
  }[status];
}
