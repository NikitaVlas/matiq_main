'use client';

import { useEffect, useState } from 'react';

const api = process.env.NEXT_PUBLIC_USER_API_URL ?? 'http://localhost:4000';

export default function RoadmapPage() {
  const [result, setResult] = useState<{ completed: boolean; roadmap: { id: string; title: string }[] }>();
  useEffect(() => {
    fetch(`${api}/assessment/result`, { credentials: 'include' })
      .then((response) => response.json())
      .then(setResult);
  }, []);
  async function update(id: string, body: object) {
    await fetch(`${api}/assessment/roadmap-items/${id}`, { method: 'PATCH', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const response = await fetch(`${api}/assessment/result`, { credentials: 'include' });
    setResult(await response.json());
  }
  return (
    <main><section className="shell"><p className="eyebrow">Roadmap</p><h1>DEIN NÄCHSTER SCHRITT</h1>
      {!result ? <p>Roadmap wird geladen …</p> : null}
      {result && !result.completed ? <p>Schließe zuerst dein <a href="/assessment">Assessment</a> ab.</p> : null}
      <div className="roadmap">{result?.roadmap.map((item) => <article key={item.id}><strong>{item.title}</strong><button onClick={() => update(item.id, { direction: 'up' })}>↑</button><button onClick={() => update(item.id, { direction: 'down' })}>↓</button><button onClick={() => update(item.id, { isHidden: true })}>Ausblenden</button></article>)}</div>
    </section></main>
  );
}
