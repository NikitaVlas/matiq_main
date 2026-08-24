'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { userApiResponse } from '../../shared/api/client';

type TrainerProfile = {
  slug: string;
  displayName: string;
  photoUrl?: string;
  biography: string;
  athleteJourney: string;
  disciplines: string[];
  belt?: string;
  qualifications: string[];
  achievements: string[];
  competitionExperience?: string;
  trainingPrinciples: string;
  city: string;
  countryCode: string;
  languages: string[];
  localAvailability?: string;
  socialLinks: { label: string; url: string }[];
  courses: { id: string; title: string; description?: string; discipline: string }[];
  videos: { id: string; title: string; description?: string; durationSec?: number }[];
};

export default function TrainerDetailPage({ slug }: { slug: string }) {
  const [trainer, setTrainer] = useState<TrainerProfile>();
  const [error, setError] = useState('');

  useEffect(() => {
    userApiResponse(`/content/trainers/${slug}`)
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setTrainer((await response.json()) as TrainerProfile);
      })
      .catch(() => setError('Dieses Trainerprofil ist nicht verfügbar.'));
  }, [slug]);

  if (error)
    return (
      <main className="trainer-page">
        <p className="error">{error}</p>
        <Link href="/trainers">Zurück zu den Trainern</Link>
      </main>
    );
  if (!trainer) return <main className="trainer-page">Trainerprofil wird geladen…</main>;

  return (
    <main className="trainer-page">
      <Link href="/trainers">← Alle Trainer</Link>
      <header className="trainer-profile-hero">
        {trainer.photoUrl ? <img src={trainer.photoUrl} alt="" /> : null}
        <div>
          <p className="eyebrow">
            {trainer.city}, {trainer.countryCode} · {trainer.languages.join(' · ')}
          </p>
          <h1>{trainer.displayName}</h1>
          <p>{trainer.biography}</p>
          <p>{trainer.disciplines.join(' · ')}</p>
        </div>
      </header>

      <div className="trainer-story-grid">
        <section>
          <p className="eyebrow">Der Weg</p>
          <h2>Vom eigenen Anfang bis heute</h2>
          <p>{trainer.athleteJourney}</p>
        </section>
        <section>
          <p className="eyebrow">Trainingsprinzipien</p>
          <h2>Wie die Vorbereitung aufgebaut ist</h2>
          <p>{trainer.trainingPrinciples}</p>
        </section>
        {trainer.competitionExperience ? (
          <section>
            <p className="eyebrow">Wettkampf</p>
            <h2>Erfahrung und Erkenntnisse</h2>
            <p>{trainer.competitionExperience}</p>
          </section>
        ) : null}
        <section>
          <p className="eyebrow">Lokal trainieren</p>
          <h2>Teil der deutschsprachigen BJJ-Szene</h2>
          <p>{trainer.localAvailability ?? `Verfügbar in ${trainer.city}.`}</p>
        </section>
      </div>

      {trainer.achievements.length ? (
        <section className="trainer-list-section">
          <h2>Meilensteine</h2>
          <ul>
            {trainer.achievements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="trainer-list-section">
        <h2>Kurse von {trainer.displayName}</h2>
        {trainer.courses.length ? (
          <div className="trainer-materials">
            {trainer.courses.map((course) => (
              <Link key={course.id} href={`/courses/${course.id}`}>
                <small>{course.discipline}</small>
                <strong>{course.title}</strong>
                {course.description ? <span>{course.description}</span> : null}
              </Link>
            ))}
          </div>
        ) : (
          <p>Noch keine veröffentlichten Kurse.</p>
        )}
      </section>

      {trainer.videos.length ? (
        <section className="trainer-list-section">
          <h2>Weitere Videos</h2>
          <div className="trainer-materials">
            {trainer.videos.map((video) => (
              <Link key={video.id} href={`/video/${video.id}`}>
                <strong>{video.title}</strong>
                {video.description ? <span>{video.description}</span> : null}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {trainer.socialLinks.length ? (
        <footer className="trainer-socials">
          {trainer.socialLinks.map((link) => (
            <a key={link.url} href={link.url} rel="noreferrer" target="_blank">
              {link.label}
            </a>
          ))}
        </footer>
      ) : null}
    </main>
  );
}
