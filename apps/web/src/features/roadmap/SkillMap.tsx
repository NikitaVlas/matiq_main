'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { buildSkillMap, stageLabels, type PlanStage, type RoadmapItem } from './skill-map';
import './skill-map.css';

export function SkillMap({
  items,
  completed,
  updatingId,
  update,
}: {
  items: RoadmapItem[];
  completed: RoadmapItem[];
  updatingId: string;
  update: (id: string, body: object) => Promise<void>;
}) {
  const { focus, branches } = buildSkillMap(items, completed);
  const [selectedId, setSelectedId] = useState('');
  const [highlight, setHighlight] = useState<PlanStage | 'all'>('all');
  const nodes = branches.flatMap((branch) => branch.nodes);
  const selected =
    nodes.find((node) => node.item.id === selectedId) ??
    nodes.find((node) => node.stage === 'now') ??
    nodes[0];
  const detail = useRef<HTMLElement>(null);
  function select(id: string) {
    setSelectedId(id);
    if (window.matchMedia('(max-width: 1000px)').matches)
      detail.current?.scrollIntoView({ block: 'start' });
  }
  if (!selected) return null;
  const item = selected.item;
  const progress = item.progress;
  return (
    <>
      <section className="skill-plan" aria-label="Dein Trainingsplan">
        <div className="skill-plan-now">
          <p className="eyebrow">01 / Jetzt trainieren</p>
          {focus.primary ? (
            <button onClick={() => select(focus.primary!.id)}>
              {focus.primary.title}
              <span aria-hidden="true"> ↗</span>
            </button>
          ) : (
            <strong>Aktueller Plan abgeschlossen</strong>
          )}
          {focus.primary && <p>Dein aktueller Fokus</p>}
        </div>
        <div>
          <p className="eyebrow">02 / Danach</p>
          {focus.next.length ? (
            focus.next.map((node, index) => (
              <button key={node.id} onClick={() => select(node.id)}>
                <span className="skill-plan-number">{index + 1}.</span> {node.title}
              </button>
            ))
          ) : (
            <p>Keine weiteren Schritte eingeplant.</p>
          )}
        </div>
        <div>
          <p className="eyebrow">03 / Später</p>
          <strong>{focus.backlog.length} weitere Themen</strong>
          <p>Deine weiteren Wege bleiben auf der Karte sichtbar.</p>
          {focus.backlog.length > 0 && (
            <button
              className="skill-plan-later"
              aria-pressed={highlight === 'later'}
              onClick={() => setHighlight(highlight === 'later' ? 'all' : 'later')}
            >
              Auf der Karte hervorheben ↗
            </button>
          )}
        </div>
      </section>
      <div className="skill-workspace">
        <section className="skill-canvas" aria-labelledby="skill-map-title">
          <header className="skill-canvas-header">
            <div>
              <p className="eyebrow">Entdecke deine Verbindungen</p>
              <h2 id="skill-map-title">Deine Skill-Karte</h2>
            </div>
            <span className="skill-count">{nodes.length} Themen</span>
          </header>
          <div className="skill-map-legend" aria-label="Planstatus hervorheben">
            {(['all', 'now', 'next', 'later', 'completed'] as const).map((stage) => (
              <button
                key={stage}
                aria-pressed={highlight === stage}
                onClick={() => setHighlight(stage)}
              >
                <span className={`skill-dot is-${stage}`} aria-hidden="true" />
                {stage === 'all' ? 'Alle' : stageLabels[stage]}
              </button>
            ))}
          </div>
          <p className="skill-map-hint">
            Wähle einen Skill für Videos und deinen nächsten Schritt. Linien verbinden
            Themenbereiche.
          </p>
          <div className="skill-tree">
            <div className="skill-root">
              <span>MATIQ</span>
              <strong>Dein Spiel</strong>
            </div>
            <div className="skill-branches">
              {branches.map((branch, index) => (
                <section className="skill-branch" key={branch.key} aria-label={branch.title}>
                  <header>
                    <span className="skill-branch-number">0{index + 1}</span>
                    <h3>{branch.title}</h3>
                    <p>{branch.description}</p>
                  </header>
                  <ul>
                    {branch.nodes.map((node) => (
                      <li key={node.item.id}>
                        <button
                          className={`skill-node is-${node.stage}${node.item.id === item.id ? ' is-selected' : ''}${highlight !== 'all' && highlight !== node.stage ? ' is-muted' : ''}`}
                          aria-pressed={node.item.id === item.id}
                          aria-controls="skill-detail"
                          onClick={() => select(node.item.id)}
                        >
                          <span className="skill-node-status">
                            <span className="skill-dot" aria-hidden="true" />
                            {stageLabels[node.stage]}
                          </span>
                          <strong>{node.item.title}</strong>
                          <span className="skill-node-meta">
                            {node.item.progress?.totalVideos
                              ? `${node.item.progress.completedVideos} / ${node.item.progress.totalVideos} Videos`
                              : 'Material folgt'}
                            <span aria-hidden="true">↗</span>
                          </span>
                          {node.item.progress?.totalVideos ? (
                            <span className="skill-node-track" aria-hidden="true">
                              <span style={{ width: `${node.item.progress.percent}%` }} />
                            </span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </section>
        <aside
          className="skill-detail"
          id="skill-detail"
          aria-labelledby="skill-detail-title"
          ref={detail}
        >
          <p className="skill-announcement" role="status">
            Ausgewählt: {item.title}. {stageLabels[selected.stage]}.
          </p>
          <p className="eyebrow">
            {stageLabels[selected.stage]} /{' '}
            {branches.find((branch) => branch.key === selected.branch)?.title}
          </p>
          <h2 id="skill-detail-title">{item.title}</h2>
          <p className="skill-detail-type">
            {
              { GAP: 'Entwicklung', CORE: 'Dein Spiel', EXPLORE: 'Neues Ziel' }[
                item.recommendationType
              ]
            }
          </p>
          <p>
            {selected.stage === 'now'
              ? 'Hier liegt dein aktueller Trainingsfokus.'
              : selected.stage === 'next'
                ? 'Dieser Skill steht als Nächstes in deinem Plan.'
                : selected.stage === 'later'
                  ? 'Für später vorgemerkt. Du kannst dieses Thema schon jetzt erkunden.'
                  : 'Diesen Roadmap-Schritt hast du abgeschlossen.'}
          </p>
          {progress?.totalVideos ? (
            <div className="skill-detail-progress">
              <label htmlFor="skill-progress">
                {progress.completedVideos} von {progress.totalVideos} Videos abgeschlossen
              </label>
              <progress id="skill-progress" max={100} value={progress.percent} />
              <p>Fortschritt im Lernmaterial, kein Nachweis der Beherrschung.</p>
            </div>
          ) : (
            <p className="skill-empty">Noch keine veröffentlichten Videos für dieses Thema.</p>
          )}
          {item.videos?.[0] && (
            <Link className="action-link" href={`/video/${item.videos[0].id}`}>
              {selected.stage === 'completed' ? 'Video wiederholen' : 'Training starten'} ↗
            </Link>
          )}
          <Link className="skill-details-link" href={`/roadmap/${item.id}`}>
            Skill und Materialien ansehen →
          </Link>
          {item.videos?.length ? (
            <div className="skill-detail-videos">
              <h3>Deine Videos</h3>
              {item.videos.slice(0, 3).map((video, index) => (
                <Link key={video.id} href={`/video/${video.id}`}>
                  <span>0{index + 1}</span>
                  {video.title}
                  <span aria-hidden="true">↗</span>
                </Link>
              ))}
            </div>
          ) : null}
          {selected.stage !== 'completed' && (
            <div className="skill-detail-edit">
              <h3>Plan anpassen</h3>
              <p>Priorität innerhalb deiner Empfehlungen ändern.</p>
              <div className="roadmap-item-actions">
                <button
                  disabled={Boolean(updatingId)}
                  aria-label={`${item.title} nach oben verschieben`}
                  onClick={() => update(item.id, { direction: 'up' })}
                >
                  ↑ Höher
                </button>
                <button
                  disabled={Boolean(updatingId)}
                  aria-label={`${item.title} nach unten verschieben`}
                  onClick={() => update(item.id, { direction: 'down' })}
                >
                  ↓ Niedriger
                </button>
                <button
                  disabled={Boolean(updatingId)}
                  onClick={() => update(item.id, { isHidden: true })}
                >
                  {updatingId === item.id ? 'Wird gespeichert…' : 'Ausblenden'}
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
