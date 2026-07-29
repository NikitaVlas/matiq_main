'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { formatDuration, getVideoTopics, progressPercent, type LessonVideo } from './lesson-state';

const api = process.env.NEXT_PUBLIC_USER_API_URL ?? 'http://localhost:4000';

type Recommendation = {
  source: 'ROADMAP' | 'LESSON_PATH' | 'METADATA';
  lessonId: string;
  videoId: string;
  title: string;
  reason: string;
};

type Recommendations = {
  primarySource: Recommendation['source'] | null;
  roadmap: Recommendation | null;
  lessonPath: Recommendation | null;
  metadataFallback: Recommendation | null;
};

type Playback = {
  video: LessonVideo;
  playbackUrl: string;
  watchedSeconds: number;
};

export default function VideoDetail({ id }: { id: string }) {
  const [data, setData] = useState<Playback>();
  const [error, setError] = useState('');
  const [locked, setLocked] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendations>();
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const lastCheckpoint = useRef(-1);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch(`${api}/content/videos/${id}/playback`, {
          credentials: 'include',
          signal: controller.signal,
        });
        if (response.status === 403) {
          setLocked(true);
          return;
        }
        if (!response.ok) throw new Error();
        const playback = (await response.json()) as Playback;
        setData(playback);
        setCurrentSeconds(playback.watchedSeconds);

        const recommendationResponse = await fetch(`${api}/content/videos/${id}/recommendations`, {
          credentials: 'include',
          signal: controller.signal,
        });
        if (recommendationResponse.ok) {
          setRecommendations((await recommendationResponse.json()) as Recommendations);
        }
      } catch (loadError) {
        if ((loadError as Error).name !== 'AbortError') {
          setError('Dieses Video ist nicht verfügbar oder deine Sitzung ist abgelaufen.');
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [id]);

  async function saveProgress(seconds: number) {
    await fetch(`${api}/content/videos/${id}/watch`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ watchedSeconds: Math.floor(seconds) }),
    }).catch(() => undefined);
  }

  if (locked) return <LockedLesson />;
  if (error) return <LessonError message={error} />;
  if (!data) return <LessonSkeleton />;

  const topics = getVideoTopics(data.video);
  const progress = progressPercent(currentSeconds, data.video.durationSec);

  return (
    <main className="lesson-page">
      <header className="lesson-header">
        <div>
          <p className="eyebrow">Lektion</p>
          <h1>{data.video.title}</h1>
        </div>
        <div className="lesson-progress" aria-label={`Fortschritt ${progress} Prozent`}>
          <strong>{progress}%</strong>
          <span>angesehen</span>
        </div>
      </header>

      <section className="lesson-player" aria-label="Videoplayer">
        <video
          controls
          controlsList="nodownload"
          src={data.playbackUrl}
          onLoadedMetadata={(event) => {
            event.currentTarget.currentTime = data.watchedSeconds;
          }}
          onTimeUpdate={(event) => {
            const seconds = Math.floor(event.currentTarget.currentTime);
            setCurrentSeconds(seconds);
            const checkpoint = Math.floor(seconds / 15);
            if (seconds > 0 && checkpoint !== lastCheckpoint.current) {
              lastCheckpoint.current = checkpoint;
              void saveProgress(seconds);
            }
          }}
          onPause={(event) => void saveProgress(event.currentTarget.currentTime)}
          onEnded={(event) => void saveProgress(event.currentTarget.currentTime)}
        />
      </section>

      <div className="lesson-layout">
        <article className="lesson-content">
          <section aria-labelledby="lesson-about-title">
            <h2 id="lesson-about-title">Über diese Lektion</h2>
            <p>
              {data.video.description ??
                'Für diese Lektion ist noch keine Beschreibung hinterlegt.'}
            </p>
          </section>

          {recommendations?.roadmap ? (
            <RecommendationBlock
              recommendation={recommendations.roadmap}
              title="Als Nächstes in deiner Roadmap"
              label="Persönlicher Fokus"
              primary={recommendations.primarySource === 'ROADMAP'}
              roadmap
            />
          ) : null}

          {recommendations?.lessonPath ? (
            <RecommendationBlock
              recommendation={recommendations.lessonPath}
              title="Diese Technikfolge fortsetzen"
              label="Vom Trainer verknüpft"
              primary={recommendations.primarySource === 'LESSON_PATH'}
            />
          ) : null}

          {recommendations?.metadataFallback ? (
            <RecommendationBlock
              recommendation={recommendations.metadataFallback}
              title="Thematisch passend"
              label="Ähnliche Inhalte"
              primary={recommendations.primarySource === 'METADATA'}
            />
          ) : null}

          {!recommendations?.roadmap &&
          !recommendations?.lessonPath &&
          !recommendations?.metadataFallback ? (
            <section className="lesson-recommendation-empty">
              <h2>Keine weitere Empfehlung verfügbar</h2>
              <p>Öffne deine Roadmap oder den Videokatalog, um eine andere Lektion auszuwählen.</p>
              <div className="lesson-actions">
                <Link className="action-link" href="/roadmap">
                  Roadmap öffnen
                </Link>
                <Link className="text-link" href="/videos">
                  Alle Videos
                </Link>
              </div>
            </section>
          ) : null}
        </article>

        <aside className="lesson-sidebar" aria-label="Lektionsdetails">
          <h2>Details</h2>
          <dl>
            <div>
              <dt>Dauer</dt>
              <dd>{formatDuration(data.video.durationSec)}</dd>
            </div>
            {topics.map((topic) => (
              <div key={topic.label}>
                <dt>{topic.label}</dt>
                <dd>{topic.value}</dd>
              </div>
            ))}
          </dl>
          <Link className="text-link" href="/history">
            Verlauf öffnen
          </Link>
        </aside>
      </div>
    </main>
  );
}

function RecommendationBlock({
  recommendation,
  title,
  label,
  primary,
  roadmap = false,
}: {
  recommendation: Recommendation;
  title: string;
  label: string;
  primary: boolean;
  roadmap?: boolean;
}) {
  return (
    <section className={`lesson-recommendation${primary ? ' is-primary' : ''}`} aria-label={title}>
      <p className="eyebrow">{label}</p>
      <h2>{title}</h2>
      <h3>{recommendation.title}</h3>
      <p>{recommendation.reason}</p>
      <div className="lesson-actions">
        <Link className="action-link" href={`/video/${recommendation.videoId}`}>
          Video ansehen
        </Link>
        {roadmap ? (
          <Link className="text-link" href="/roadmap">
            Zur Roadmap
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function LessonSkeleton() {
  return (
    <main className="lesson-page" aria-busy="true" aria-label="Lektion wird geladen">
      <div className="lesson-skeleton lesson-skeleton-title" />
      <div className="lesson-skeleton lesson-skeleton-player" />
      <div className="lesson-skeleton lesson-skeleton-copy" />
    </main>
  );
}

function LockedLesson() {
  return (
    <main className="lesson-state-page">
      <section className="lesson-state-panel">
        <p className="eyebrow">Mitgliedschaft erforderlich</p>
        <h1>Dieses Video ist geschützt.</h1>
        <p>Starte deinen Testzugang oder wähle eine Mitgliedschaft, um die Lektion anzusehen.</p>
        <Link className="action-link" href="/subscription">
          Zugang freischalten
        </Link>
      </section>
    </main>
  );
}

function LessonError({ message }: { message: string }) {
  return (
    <main className="lesson-state-page">
      <section className="lesson-state-panel" role="alert">
        <p className="eyebrow">Lektion nicht verfügbar</p>
        <h1>Die Lektion konnte nicht geladen werden.</h1>
        <p>{message}</p>
        <Link className="action-link" href="/login">
          Anmelden
        </Link>
      </section>
    </main>
  );
}
