'use client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { userApiResponse } from '../../shared/api/client';
import { ProfileSelect } from './ProfileSelect';
export default function AthleteProfilePage() {
  const router = useRouter();
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const experienceYears = Number(data.get('experienceYears'));
    const experienceMonths = experienceYears * 12 + Number(data.get('experienceMonths'));
    if (experienceMonths > 960) {
      setError('Bitte gib höchstens 80 Jahre Trainingserfahrung an.');
      return;
    }
    const response = await userApiResponse('/athlete-profile', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        disciplines: data.getAll('disciplines'),
        belt: data.get('belt') || undefined,
        experienceMonths,
        experienceYears,
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
        <h1>Wie trainierst du?</h1>
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
          <ProfileSelect
            label="Gürtel"
            name="belt"
            options={[
              { value: '', label: 'Nicht angegeben' },
              { value: 'WHITE', label: 'Weiß', color: '#fff' },
              { value: 'BLUE', label: 'Blau', color: '#2861a8' },
              { value: 'PURPLE', label: 'Lila', color: '#784491' },
              { value: 'BROWN', label: 'Braun', color: '#805533' },
              { value: 'BLACK', label: 'Schwarz', color: '#111418' },
            ]}
          />
          <fieldset className="profile-experience">
            <legend>Trainingserfahrung</legend>
            <div className="profile-experience-fields">
              <label>
                Jahre
                <input
                  name="experienceYears"
                  type="number"
                  min="0"
                  max="80"
                  step="1"
                  defaultValue="0"
                  required
                />
              </label>
              <label>
                Monate
                <input
                  name="experienceMonths"
                  type="number"
                  min="0"
                  max="11"
                  step="1"
                  defaultValue="0"
                  required
                />
              </label>
            </div>
          </fieldset>
          <label>
            Trainings pro Woche
            <input name="trainingSessionsPerWeek" type="number" min="1" max="14" required />
          </label>
          <ProfileSelect
            label="Wettkampferfahrung"
            name="competitionExperience"
            options={[
              { value: 'no', label: 'Nein' },
              { value: 'yes', label: 'Ja' },
            ]}
          />
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
