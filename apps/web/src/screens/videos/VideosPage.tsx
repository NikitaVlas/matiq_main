'use client';

import { useEffect, useState } from 'react';

const api = process.env.NEXT_PUBLIC_USER_API_URL ?? 'http://localhost:4000';

type Video = {
  id: string;
  title: string;
  description?: string | null;
  durationSec?: number | null;
};

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>();
  const [hasAccess, setHasAccess] = useState(false);
  const [progress, setProgress] = useState<Record<string, { watchedSeconds: number; completed: boolean }>>({});

  useEffect(() => {
    fetch(`${api}/content/catalog`)
      .then((response) => response.json())
      .then((areas) => {
        const items: Video[] = [];
        for (const area of areas)
          for (const position of area.positions) {
            items.push(...position.videos);
            for (const group of position.skillGroups)
              for (const technique of group.techniques)
                for (const variant of technique.variants) items.push(...variant.videos);
          }
        setVideos(items);
      });
    fetch(`${api}/subscription`, { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : { hasAccess: false }))
      .then((subscription) => setHasAccess(Boolean(subscription.hasAccess)));
    fetch(`${api}/content/history`, { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : []))
      .then((items) => setProgress(Object.fromEntries(items.map((item: { video: { id: string }; watchedSeconds: number; completed: boolean }) => [item.video.id, item]))));
  }, []);

  return (
    <main>
      <section className="shell">
        <p className="eyebrow">Videothek</p>
        <h1>VIDEOS</h1>
        {!videos ? <p>Videos werden geladen …</p> : null}
        {videos?.length === 0 ? (
          <p>Neue Videos erscheinen hier, sobald sie veröffentlicht sind.</p>
        ) : null}
        <div className="roadmap">
          {videos?.map((video) => (
            <article key={video.id}>
              <div>
                <strong>{video.title}</strong>
                <p>{video.description ?? 'Kuratierte Lernlektion'}</p>
                <p>{progress[video.id]?.completed ? 'Angesehen' : progress[video.id] ? `Weiter ab ${Math.floor((progress[video.id]?.watchedSeconds ?? 0) / 60)}:${String((progress[video.id]?.watchedSeconds ?? 0) % 60).padStart(2, '0')}` : 'Neu'}</p>
              </div>
              <a href={hasAccess ? `/video/${video.id}` : '/subscription'}>
                {hasAccess ? 'Ansehen' : 'Mitgliedschaft erforderlich'}
              </a>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
