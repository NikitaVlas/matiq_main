'use client';

import { useEffect, useState } from 'react';

const api = process.env.NEXT_PUBLIC_USER_API_URL ?? 'http://localhost:4000';

type Discipline = 'BJJ_GI' | 'NO_GI_GRAPPLING';
type RoadmapItem = {
  id: string;
  title: string;
  videos?: { id: string; title: string }[];
};
type Roadmap = {
  discipline: Discipline;
  items: RoadmapItem[];
  hiddenItems: RoadmapItem[];
};
type Result = { completed: boolean; roadmaps: Roadmap[] };

export default function RoadmapPage() {
  const [result, setResult] = useState<Result>();
  const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline>();

  async function load() {
    const response = await fetch(`${api}/assessment/result`, { credentials: 'include' });
    const value = (await response.json()) as Result;
    setResult(value);
    setSelectedDiscipline((current) => current ?? value.roadmaps[0]?.discipline);
  }

  useEffect(() => {
    void load();
  }, []);

  async function update(id: string, body: object) {
    await fetch(`${api}/assessment/roadmap-items/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    await load();
  }

  const roadmap = result?.roadmaps.find((item) => item.discipline === selectedDiscipline);

  return (
    <main>
      <section className="shell">
        <p className="eyebrow">Roadmap</p>
        <h1>DEIN NÄCHSTER SCHRITT</h1>
        {!result ? <p>Roadmap wird geladen …</p> : null}
        {result && !result.completed ? (
          <p>
            Schließe zuerst dein <a href="/assessment">Assessment</a> ab.
          </p>
        ) : null}
        {result?.roadmaps.length ? (
          <nav aria-label="Disziplin auswählen">
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
        {roadmap && !roadmap.items.length ? (
          <p>Für diese Disziplin gibt es noch keine Empfehlungen.</p>
        ) : null}
        <div className="roadmap">
          {roadmap?.items.map((item) => (
            <article key={item.id}>
              <strong>{item.title}</strong>
              {item.videos?.map((video) => (
                <a key={video.id} href={`/video/${video.id}`}>
                  {video.title}
                </a>
              ))}
              <button onClick={() => update(item.id, { direction: 'up' })}>↑</button>
              <button onClick={() => update(item.id, { direction: 'down' })}>↓</button>
              <button onClick={() => update(item.id, { isHidden: true })}>Ausblenden</button>
            </article>
          ))}
        </div>
        {roadmap?.hiddenItems.length ? (
          <>
            <h2>Ausgeblendete Empfehlungen</h2>
            <div className="roadmap">
              {roadmap.hiddenItems.map((item) => (
                <article key={item.id}>
                  <strong>{item.title}</strong>
                  <button onClick={() => update(item.id, { isHidden: false })}>
                    Wiederherstellen
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
