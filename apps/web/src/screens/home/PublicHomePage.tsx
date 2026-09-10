'use client';
import Link from 'next/link';
import { useRef } from 'react';
import type { ReactNode } from 'react';
import { type CatalogVideo, disciplineLabel } from '../../features/catalog/catalog';
import { usePublicData } from '../../features/catalog/use-public-data';
import { VideoCard } from '../../features/catalog/VideoCard';
type Trainer = {
  slug: string;
  displayName: string;
  biography: string;
  photoUrl: string | null;
  city: string;
  disciplines: string[];
};
function Collection({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: ReactNode;
}) {
  const rail = useRef<HTMLDivElement>(null);
  return (
    <section className="public-collection" aria-label={title}>
      <header>
        <h2>{title}</h2>
        <div>
          <Link href={href}>Alle entdecken</Link>
          <button
            type="button"
            aria-label={`${title}: zurück`}
            onClick={() => rail.current?.scrollBy({ left: -340 })}
          >
            ←
          </button>
          <button
            type="button"
            aria-label={`${title}: weiter`}
            onClick={() => rail.current?.scrollBy({ left: 340 })}
          >
            →
          </button>
        </div>
      </header>
      <div
        className="public-rail"
        ref={rail}
        tabIndex={0}
        role="region"
        aria-label={`${title} durchblättern`}
      >
        {children}
      </div>
    </section>
  );
}
export default function PublicHomePage() {
  const videos = usePublicData<CatalogVideo[]>('/content/videos');
  const trainers = usePublicData<Trainer[]>('/content/trainers');
  return (
    <main className="public-home">
      <header className="public-intro">
        <div>
          <p className="eyebrow">BJJ Gi & No-Gi · MATIQ</p>
          <h1>Entdecke dein nächstes Training.</h1>
          <p>Techniken, Kurse und Athleten aus der deutschen Grappling-Szene.</p>
        </div>
        <div className="public-account">
          <Link className="action-link" href="/register">
            Kostenlos registrieren
          </Link>
          <Link href="/login">Bereits dabei? Anmelden</Link>
        </div>
      </header>
      <Collection title="Videos entdecken" href="/videos">
        {videos.error ? (
          <div role="alert">
            <p>Videos konnten nicht geladen werden.</p>
            <button onClick={videos.retry}>Videos erneut laden</button>
          </div>
        ) : !videos.data ? (
          <p role="status">Videos werden geladen …</p>
        ) : videos.data.length === 0 ? (
          <p>Neue Videos erscheinen hier nach ihrer Veröffentlichung.</p>
        ) : (
          videos.data
            .slice(0, 12)
            .map((video, index) => <VideoCard key={video.id} video={video} index={index} />)
        )}
      </Collection>
      <Collection title="Die Athleten hinter den Techniken" href="/trainers">
        {trainers.error ? (
          <div role="alert">
            <p>Trainer konnten nicht geladen werden.</p>
            <button onClick={trainers.retry}>Trainer erneut laden</button>
          </div>
        ) : !trainers.data ? (
          <p role="status">Trainer werden geladen …</p>
        ) : trainers.data.length === 0 ? (
          <p>Trainerprofile werden hier nach ihrer Veröffentlichung sichtbar.</p>
        ) : (
          trainers.data.slice(0, 12).map((trainer) => (
            <article key={trainer.slug} className="public-trainer-card">
              {trainer.photoUrl ? (
                <img src={trainer.photoUrl} alt="" loading="lazy" />
              ) : (
                <div className="trainer-initial" aria-hidden="true">
                  {trainer.displayName.slice(0, 1)}
                </div>
              )}
              <p className="catalog-meta">
                {trainer.city} · {trainer.disciplines.map(disciplineLabel).join(' / ')}
              </p>
              <h3>
                <Link href={`/trainers/${trainer.slug}`}>{trainer.displayName}</Link>
              </h3>
              <p className="catalog-description">{trainer.biography}</p>
              <Link href={`/trainers/${trainer.slug}`}>Athleten kennenlernen ↗</Link>
            </article>
          ))
        )}
      </Collection>
    </main>
  );
}
