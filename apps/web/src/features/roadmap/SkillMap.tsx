'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import {
  buildSkillMap,
  stageLabels,
  type PlanStage,
  type RoadmapItem,
  type SkillChoice,
} from './skill-map';
import './skill-map.css';

export function SkillMap({
  items,
  completed,
  choices = [],
  updatingId,
  update,
}: {
  items: RoadmapItem[];
  completed: RoadmapItem[];
  choices?: SkillChoice[];
  updatingId: string;
  update: (id: string, body: object) => Promise<boolean>;
}) {
  const availableChoices = choices.map((choice) => ({
    ...choice,
    options: choice.options.filter(
      (option) =>
        option.publishedVideoCount !== 0 ||
        [...items, ...completed].some((item) => item.skillKey === option.key),
    ),
  }));
  const { focus, branches } = buildSkillMap(items, completed, availableChoices);
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
  const selectedKeys =
    selected.choice?.options
      .filter((option) => nodes.some((node) => node.item.skillKey === option.key))
      .map((option) => option.key) ?? [];
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
                    {Array.from(
                      new Set(branch.nodes.map((node) => node.choice?.parentKey ?? node.item.id)),
                    ).map((clusterKey) => {
                      const cluster = branch.nodes.filter(
                        (node) => (node.choice?.parentKey ?? node.item.id) === clusterKey,
                      );
                      const choice = cluster[0]?.choice;
                      return (
                        <SkillCluster
                          key={clusterKey}
                          cluster={cluster}
                          choice={choice}
                          selectedId={item.id}
                          highlight={highlight}
                          select={select}
                        />
                      );
                    })}
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
            {(item.recommendationTypes ?? [item.recommendationType])
              .map(
                (type) => ({ GAP: 'Entwicklung', CORE: 'Dein Spiel', EXPLORE: 'Neues Ziel' })[type],
              )
              .join(' · ')}
          </p>
          {selected.choice && selected.choice.options.length > 0 && (
            <SkillSelection
              key={`${selected.choice.parentKey}:${selectedKeys.join(',')}`}
              choice={selected.choice}
              selectedKeys={selectedKeys}
              pending={Boolean(updatingId)}
              save={(keys) => update(item.id, { selectedSkillKeys: keys })}
            />
          )}
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

type MapNode = ReturnType<typeof buildSkillMap>['branches'][number]['nodes'][number];

function SkillCluster({
  cluster,
  choice,
  selectedId,
  highlight,
  select,
}: {
  cluster: MapNode[];
  choice?: SkillChoice;
  selectedId: string;
  highlight: PlanStage | 'all';
  select: (id: string) => void;
}) {
  const renderNode = (node: MapNode) => (
    <button
      key={node.item.id}
      className={`skill-node is-${node.stage}${node.item.id === selectedId ? ' is-selected' : ''}${highlight !== 'all' && highlight !== node.stage ? ' is-muted' : ''}`}
      aria-pressed={node.item.id === selectedId}
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
  );
  if (!choice) return <li>{cluster.map(renderNode)}</li>;
  const parents = cluster.filter((node) => node.item.skillKey === choice.parentKey);
  const selectedChildren = cluster.filter((node) => node.item.skillKey !== choice.parentKey);
  return (
    <li className="skill-cluster">
      {parents.length ? (
        parents.map(renderNode)
      ) : (
        <button className="skill-parent-toggle" onClick={() => select(cluster[0]!.item.id)}>
          <strong>{choice.title}</strong>
          <span>
            {selectedChildren
              .map((node) => `${stageLabels[node.stage]}: ${node.item.title}`)
              .join(' · ')}
          </span>
        </button>
      )}
      {choice.options.length > 0 && (
        <details className="skill-subskills">
          <summary>
            <span className="skill-expand-label">Skills anzeigen · {choice.options.length}</span>
            <span className="skill-collapse-label">Skills einklappen</span>
          </summary>
          {selectedChildren.map(renderNode)}
          {choice.options
            .filter((option) => !cluster.some((node) => node.item.skillKey === option.key))
            .map((option) => (
              <button
                className="skill-option-preview"
                key={option.key}
                onClick={() => select(cluster[0]!.item.id)}
              >
                <span>{option.title}</span>
                <span>Nicht im Plan · Auswählen ↗</span>
              </button>
            ))}
        </details>
      )}
    </li>
  );
}

function SkillSelection({
  choice,
  selectedKeys,
  pending,
  save,
}: {
  choice: SkillChoice;
  selectedKeys: string[];
  pending: boolean;
  save: (keys: string[]) => Promise<boolean>;
}) {
  const [keys, setKeys] = useState(selectedKeys);
  const [message, setMessage] = useState('');
  const changed = [...keys].sort().join('|') !== [...selectedKeys].sort().join('|');
  return (
    <form
      className="skill-selection"
      onSubmit={async (event) => {
        event.preventDefault();
        setMessage('');
        const saved = await save(keys);
        setMessage(
          saved
            ? 'Deine Auswahl ist gespeichert.'
            : 'Auswahl nicht gespeichert. Bitte erneut versuchen.',
        );
      }}
    >
      <fieldset disabled={pending}>
        <legend>Deine Skills in {choice.title}</legend>
        <p>Wähle, was du trainieren möchtest. Ohne Auswahl bleibt das ganze Thema im Plan.</p>
        {choice.options.map((option) => (
          <label key={option.key}>
            <input
              type="checkbox"
              checked={keys.includes(option.key)}
              onChange={(event) =>
                setKeys(
                  event.target.checked
                    ? [...keys, option.key]
                    : keys.filter((key) => key !== option.key),
                )
              }
            />
            {option.title}
          </label>
        ))}
      </fieldset>
      <button disabled={pending || !changed} type="submit">
        {pending ? 'Wird gespeichert…' : 'Auswahl speichern'}
      </button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
