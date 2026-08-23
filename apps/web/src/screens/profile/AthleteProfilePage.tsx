'use client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { userApiResponse } from '../../shared/api/client';
export default function AthleteProfilePage() {
  const router = useRouter();
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await userApiResponse('/athlete-profile', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        disciplines: data.getAll('disciplines'),
        belt: data.get('belt') || undefined,
        experienceMonths: Number(data.get('experienceMonths')),
        experienceYears: Math.floor(Number(data.get('experienceMonths')) / 12),
        trainingSessionsPerWeek: Number(data.get('trainingSessionsPerWeek')),
        competitionExperience: data.get('competitionExperience') === 'yes',
        goals: data.getAll('goals'),
      }),
    });
    if (!response.ok) {
      setError('Bitte prüfe deine Angaben.');
      return;
    }
    router.push('/dashboard');
  }
  return (
    <main>
      <section className="shell">
        <p className="eyebrow">Athletenprofil</p>
        <h2>Wie trainierst du?</h2>
        <form onSubmit={submit}>
          <fieldset>
            <legend>Disziplinen</legend>
            <label className="choice">
              <input type="checkbox" name="disciplines" value="BJJ_GI" /> BJJ Gi
            </label>
            <label className="choice">
              <input type="checkbox" name="disciplines" value="NO_GI_GRAPPLING" /> No-Gi Grappling
            </label>
          </fieldset>
          <label>
            Gürtel
            <select name="belt">
              <option value="">Nicht angegeben</option>
              <option value="WHITE">Weiß</option>
              <option value="BLUE">Blau</option>
              <option value="PURPLE">Lila</option>
              <option value="BROWN">Braun</option>
              <option value="BLACK">Schwarz</option>
            </select>
          </label>
          <label>
            Trainingserfahrung in Monaten
            <input name="experienceMonths" type="number" min="0" max="960" required />
          </label>
          <label>
            Trainings pro Woche
            <input name="trainingSessionsPerWeek" type="number" min="1" max="14" required />
          </label>
          <label>
            Wettkampferfahrung
            <select name="competitionExperience">
              <option value="no">Nein</option>
              <option value="yes">Ja</option>
            </select>
          </label>
          <fieldset>
            <legend>Ziele</legend>
            <label className="choice">
              <input type="checkbox" name="goals" value="GENERAL_DEVELOPMENT" /> Allgemeine
              Entwicklung
            </label>
            <label className="choice">
              <input type="checkbox" name="goals" value="COMPETITION" /> Wettkampfvorbereitung
            </label>
            <label className="choice">
              <input type="checkbox" name="goals" value="RETURN_AFTER_BREAK" /> Rückkehr nach einer
              Pause
            </label>
          </fieldset>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button>Profil speichern</button>
        </form>
      </section>
    </main>
  );
}
