'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { userApiResponse } from '../../shared/api/client';

type TrainerSummary = {
  slug: string;
  displayName: string;
  photoUrl?: string;
  biography: string;
  disciplines: string[];
  belt?: string;
  achievements: string[];
  city: string;
  countryCode: string;
  languages: string[];
  localAvailability?: string;
  user: { _count: { authoredCourses: number; authoredVideos: number } };
};

export default function TrainersPage() {
  const [trainers, setTrainers] = useState<TrainerSummary[]>();
  const [error, setError] = useState('');

  useEffect(() => {
    userApiResponse('/content/trainers')
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setTrainers((await response.json()) as TrainerSummary[]);
      })
      .catch(() => setError('Die Trainer konnten nicht geladen werden.'));
  }, []);

  return (
    <main className="trainer-page">
      <header className="trainer-page-header">
        <p className="eyebrow">Deutsche BJJ-Community</p>
        <h1>Trainiere mit Athleten aus deiner Szene.</h1>
        <p>
          Lerne nicht nur Techniken, sondern auch die Wege, Wettkampferfahrungen und
          Trainingsprinzipien der Menschen hinter den Kursen kennen.
        </p>
      </header>
      {error ? <p className="error">{error}</p> : null}
      {!trainers ? <p>Trainer werden geladen…</p> : null}
      {trainers?.length === 0 ? <p>Noch sind keine Trainerprofile veröffentlicht.</p> : null}
      <div className="trainer-grid">
        {trainers?.map((trainer) => (
          <article className="trainer-card" key={trainer.slug}>
            {trainer.photoUrl ? <img src={trainer.photoUrl} alt="" /> : null}
            <p className="eyebrow">
              {trainer.city}, {trainer.countryCode}
            </p>
            <h2>{trainer.displayName}</h2>
            <p>{trainer.biography}</p>
            <p>
              {trainer.disciplines.join(' · ')}
              {trainer.belt ? ` · ${trainer.belt}` : ''}
            </p>
            <small>
              {trainer.user._count.authoredCourses} Kurse · {trainer.user._count.authoredVideos}{' '}
              Videos
            </small>
            <Link className="action-link" href={`/trainers/${trainer.slug}`}>
              Sportlerprofil ansehen
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
