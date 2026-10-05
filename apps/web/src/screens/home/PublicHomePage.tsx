'use client';
import Link from 'next/link';
import { useRef } from 'react';
import type { ReactNode } from 'react';
import { type CatalogVideo, disciplineLabel } from '../../features/catalog/catalog';
import { usePublicData } from '../../features/catalog/use-public-data';
import { useSessionVisibility } from '../../features/auth/SessionVisibility';
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
  const session = useSessionVisibility();
  const authenticated = session === 'authenticated';
  const trainers = usePublicData<Trainer[]>('/content/trainers');
  return (
    <main className="public-home">
      {session === 'loading' ? (
        <p role="status">Dein Trainingsbereich wird geladen …</p>
      ) : authenticated ? (
        <header className="public-intro member-intro">
          <div>
            <p className="eyebrow">Dein Training · MATIQ</p>
            <h1>Bereit für die nächste Runde?</h1>
            <p>Arbeite an deinem Spiel. Entdecke neue Techniken und finde deinen nächsten Kurs.</p>
          </div>
          <div className="public-account">
            <Link className="action-link" href="/dashboard">
              Zu meinem Training
            </Link>
            <Link href="/roadmap">Meine Roadmap ansehen →</Link>
          </div>
        </header>
      ) : (
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
      )}
      {authenticated && (
        <>
          <HomeVideos />
          <HomeCourses />
        </>
      )}
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

function HomeVideos() {
  const videoPage = usePublicData<{
    items: CatalogVideo[];
    total: number;
    page: number;
    limit: number;
  }>('/content/video-page', 'limit=12', 'page');
  const videos = { ...videoPage, data: videoPage.data?.items };
  return (
    <Collection title="Neu in der Videothek" href="/videos">
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
  );
}

function HomeCourses() {
  const courses = usePublicData<
    {
      id: string;
      title: string;
      description?: string;
      modules: { lessons: { id: string }[] }[];
    }[]
  >('/content/courses');
  return (
    <Collection title="Kurse für dein Training" href="/courses">
      {courses.error ? (
        <div role="alert">
          <p>Kurse konnten nicht geladen werden.</p>
          <button onClick={courses.retry}>Kurse erneut laden</button>
        </div>
      ) : !courses.data ? (
        <p role="status">Kurse werden geladen …</p>
      ) : courses.data.length === 0 ? (
        <p>Neue Kurse erscheinen hier nach ihrer Veröffentlichung.</p>
      ) : (
        courses.data.slice(0, 12).map((course) => (
          <article className="home-course-card" key={course.id}>
            <p className="eyebrow">
              Kurs · {course.modules.reduce((count, module) => count + module.lessons.length, 0)}{' '}
              Lektionen
            </p>
            <h3>
              <Link href={`/courses/${course.id}`}>{course.title}</Link>
            </h3>
            {course.description && <p className="catalog-description">{course.description}</p>}
            <Link className="action-link" href={`/courses/${course.id}`}>
              Kurs ansehen →
            </Link>
          </article>
        ))
      )}
    </Collection>
  );
}
