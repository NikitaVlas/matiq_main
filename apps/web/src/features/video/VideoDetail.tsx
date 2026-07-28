'use client';

import { useEffect, useState } from 'react';
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

export default function VideoDetail({ id }: { id: string }) {
  const [data, setData] = useState<{
    video: { title: string; description?: string; durationSec?: number };
    playbackUrl: string;
    watchedSeconds: number;
  }>();
  const [error, setError] = useState('');
  const [locked, setLocked] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendations>();
  useEffect(() => {
    fetch(`${api}/content/videos/${id}/playback`, { credentials: 'include' })
      .then(async (response) => {
        if (response.status === 403) {
          setLocked(true);
          return;
        }
        if (!response.ok) throw new Error();
        setData(await response.json());
        fetch(`${api}/content/videos/${id}/recommendations`, { credentials: 'include' })
          .then((recommendationResponse) =>
            recommendationResponse.ok ? recommendationResponse.json() : undefined,
          )
          .then(setRecommendations)
          .catch(() => undefined);
      })
      .catch(() => setError('Dieses Video ist nicht verfügbar oder deine Sitzung ist abgelaufen.'));
  }, [id]);
  if (locked)
    return (
      <main>
        <section className="shell">
          <p className="eyebrow">Mitgliedschaft erforderlich</p>
          <h1>DIESES VIDEO IST GESCHÜTZT.</h1>
          <p>Starte deinen Testzugang oder wähle eine Mitgliedschaft, um dieses Video anzusehen.</p>
          <a href="/subscription">Zugang freischalten</a>
        </section>
      </main>
    );
  if (error)
    return (
      <main>
        <section className="shell">
          <p className="error">{error}</p>
          <a href="/login">Anmelden</a>
        </section>
      </main>
    );
  if (!data)
    return (
      <main>
        <section className="shell">
          <p>Video wird geladen …</p>
        </section>
      </main>
    );
  function saveProgress(element: HTMLVideoElement) {
    fetch(`${api}/content/videos/${id}/watch`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        watchedSeconds: Math.floor(element.currentTime),
        completed: element.ended,
      }),
    });
  }
  return (
    <main>
      <section className="shell">
        <p className="eyebrow">Video Detail</p>
        <h1>{data.video.title}</h1>
        <video
          controls
          controlsList="nodownload"
          src={data.playbackUrl}
          onLoadedMetadata={(event) => {
            event.currentTarget.currentTime = data.watchedSeconds;
          }}
          onTimeUpdate={(event) => {
            const element = event.currentTarget;
            if (Math.floor(element.currentTime) % 15 === 0)
              fetch(`${api}/content/videos/${id}/watch`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                  watchedSeconds: Math.floor(element.currentTime),
                  completed: Boolean(
                    data.video.durationSec && element.currentTime / data.video.durationSec > 0.8,
                  ),
                }),
              });
          }}
          onPause={(event) => saveProgress(event.currentTarget)}
          onEnded={(event) => saveProgress(event.currentTarget)}
          style={{ width: '100%', background: '#111' }}
        />
        <details>
          <summary>Informationen zum Video</summary>
          <p>{data.video.description ?? 'Keine zusätzliche Beschreibung.'}</p>
        </details>
        {recommendations?.roadmap ? (
          <RecommendationBlock
            recommendation={recommendations.roadmap}
            title="Als Nächstes in deiner Roadmap"
            primary={recommendations.primarySource === 'ROADMAP'}
            roadmap
          />
        ) : null}
        {recommendations?.lessonPath ? (
          <RecommendationBlock
            recommendation={recommendations.lessonPath}
            title="Diese Technikfolge fortsetzen"
            primary={recommendations.primarySource === 'LESSON_PATH'}
          />
        ) : null}
        {recommendations?.metadataFallback ? (
          <RecommendationBlock
            recommendation={recommendations.metadataFallback}
            title="Thematisch passend"
            primary={recommendations.primarySource === 'METADATA'}
          />
        ) : null}
      </section>
    </main>
  );
}

function RecommendationBlock({
  recommendation,
  title,
  primary,
  roadmap = false,
}: {
  recommendation: Recommendation;
  title: string;
  primary: boolean;
  roadmap?: boolean;
}) {
  return (
    <section
      aria-label={title}
      style={{ marginTop: '2rem', borderTop: '1px solid #ccc', paddingTop: '1.25rem' }}
    >
      <p className="eyebrow">{primary ? 'Hauptempfehlung' : 'Weitere Empfehlung'}</p>
      <h2>{title}</h2>
      <h3>{recommendation.title}</h3>
      <p>{recommendation.reason}</p>
      <a href={`/video/${recommendation.videoId}`}>Video ansehen</a>
      {roadmap ? (
        <p>
          <a href="/roadmap">Zur Roadmap</a>
        </p>
      ) : null}
    </section>
  );
}
