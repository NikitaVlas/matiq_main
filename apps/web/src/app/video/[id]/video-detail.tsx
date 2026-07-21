'use client';

import { useEffect, useState } from 'react';
const api = process.env.NEXT_PUBLIC_USER_API_URL ?? 'http://localhost:4000';

export default function VideoDetail({ id }: { id: string }) {
  const [data, setData] = useState<{
    video: { title: string; description?: string; durationSec?: number };
    playbackUrl: string;
  }>();
  const [error, setError] = useState('');
  useEffect(() => {
    fetch(`${api}/content/videos/${id}/playback`, { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setData(await response.json());
      })
      .catch(() => setError('Dieses Video ist nicht verfügbar oder deine Sitzung ist abgelaufen.'));
  }, [id]);
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
  return (
    <main>
      <section className="shell">
        <p className="eyebrow">Video Detail</p>
        <h1>{data.video.title}</h1>
        <video
          controls
          controlsList="nodownload"
          src={data.playbackUrl}
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
          style={{ width: '100%', background: '#111' }}
        />
        <details>
          <summary>Informationen zum Video</summary>
          <p>{data.video.description ?? 'Keine zusätzliche Beschreibung.'}</p>
        </details>
      </section>
    </main>
  );
}
