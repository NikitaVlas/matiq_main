'use client';

import { useEffect, useState } from 'react';
import { userApiResponse } from '../../shared/api/client';

type HistoryItem = {
  watchedSeconds: number;
  completed: boolean;
  video: { id: string; title: string; durationSec?: number | null };
};

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>();
  useEffect(() => {
    userApiResponse('/content/history')
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
                <p>
                  {item.completed
                    ? 'Angesehen'
                    : `Weiter ab ${Math.floor(item.watchedSeconds / 60)}:${String(item.watchedSeconds % 60).padStart(2, '0')}`}
                </p>
              </div>
              <a href={`/video/${item.video.id}`}>Fortsetzen</a>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
