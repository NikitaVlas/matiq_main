'use client';

import { useEffect, useState } from 'react';

const api = process.env.NEXT_PUBLIC_USER_API_URL ?? 'http://localhost:4000';

type HistoryItem = {
  watchedSeconds: number;
  completed: boolean;
  video: { id: string; title: string; durationSec?: number | null };
};

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>();
  useEffect(() => {
    fetch(`${api}/content/history`, { credentials: 'include' })
      .then((response) => response.json())
      .then(setItems);
  }, []);
  return (
    <main>
      <section className="shell">
        <p className="eyebrow">Verlauf</p>
        <h1>DEINE VIDEOS</h1>
        {!items ? <p>Verlauf wird geladen …</p> : null}
        {items?.length === 0 ? <p>Du hast noch keine Videos angesehen.</p> : null}
        <div className="roadmap">
          {items?.map((item) => (
            <article key={item.video.id}>
              <div>
                <strong>{item.video.title}</strong>
                <p>{item.completed ? 'Angesehen' : `${item.watchedSeconds} Sekunden angesehen`}</p>
              </div>
              <a href={`/video/${item.video.id}`}>Fortsetzen</a>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
