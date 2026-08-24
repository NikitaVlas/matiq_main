'use client';

import type { AdminApiPath } from '@matiq/contracts';
import { FormEvent, useEffect, useState } from 'react';
import { adminApi } from '../../shared/api/client';

type Profile = {
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
  published: boolean;
};

type Trainer = {
  id: string;
  email: string;
  trainerProfile?: Profile;
  _count: { authoredCourses: number; authoredVideos: number };
};

type AuthoredContent = { id: string; title: string; trainerId?: string | null };

const emptyProfile: Profile = {
  slug: '',
  displayName: '',
  biography: '',
  athleteJourney: '',
  disciplines: ['BJJ_GI'],
  qualifications: [],
  achievements: [],
  trainingPrinciples: '',
  city: '',
  countryCode: 'DE',
  languages: ['Deutsch'],
  socialLinks: [],
  published: false,
};

export default function TrainerManagementPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [courses, setCourses] = useState<AuthoredContent[]>([]);
  const [videos, setVideos] = useState<AuthoredContent[]>([]);
  const [message, setMessage] = useState('');

  async function load(preferredId?: string) {
    const [response, coursesResponse, videosResponse] = await Promise.all([
      adminApi('/admin/trainers'),
      adminApi('/admin/content/courses'),
      adminApi('/admin/videos'),
    ]);
    if (!response.ok || !coursesResponse.ok || !videosResponse.ok) throw new Error();
    const result = (await response.json()) as Trainer[];
    setCourses((await coursesResponse.json()) as AuthoredContent[]);
    setVideos((await videosResponse.json()) as AuthoredContent[]);
    setTrainers(result);
    const id = preferredId ?? selectedId ?? result[0]?.id ?? '';
    setSelectedId(id);
    setProfile(result.find((trainer) => trainer.id === id)?.trainerProfile ?? emptyProfile);
  }

  useEffect(() => {
    void load().catch(() => setMessage('Trainer konnten nicht geladen werden.'));
  }, []);

  function choose(id: string) {
    setSelectedId(id);
    setProfile(trainers.find((trainer) => trainer.id === id)?.trainerProfile ?? emptyProfile);
    setMessage('');
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const payload = { ...profile };
    Reflect.deleteProperty(payload, 'published');
    const response = await adminApi(`/admin/trainers/${selectedId}/profile`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setMessage(response.ok ? 'Entwurf gespeichert.' : 'Profil konnte nicht gespeichert werden.');
    if (response.ok) await load(selectedId);
  }

  async function publication(action: 'publish' | 'unpublish') {
    const response = await adminApi(`/admin/trainers/${selectedId}/${action}`, { method: 'POST' });
    setMessage(response.ok ? 'Publikationsstatus aktualisiert.' : 'Aktion nicht erlaubt.');
    if (response.ok) await load(selectedId);
  }

  async function assignAuthor(kind: 'course' | 'video', id: string, assigned: boolean) {
    const path = (
      kind === 'course' ? `/admin/content/courses/${id}` : `/admin/videos/${id}/author`
    ) as AdminApiPath;
    const response = await adminApi(path, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ trainerId: assigned ? selectedId : null }),
    });
    setMessage(response.ok ? 'Autorenzuordnung aktualisiert.' : 'Zuordnung fehlgeschlagen.');
    if (response.ok) await load(selectedId);
  }

  const selected = trainers.find((trainer) => trainer.id === selectedId);
  return (
    <main style={{ margin: '40px auto', maxWidth: 1100, padding: 24 }}>
      <p>MATIQ Redaktion</p>
      <h1>Sportlerprofile der Trainer</h1>
      <p>
        Hier wird die Geschichte des Autors gepflegt. Upload und Veröffentlichung der Inhalte
        bleiben bei MATIQ.
      </p>
      <label>
        Trainer
        <select value={selectedId} onChange={(event) => choose(event.target.value)}>
          {trainers.map((trainer) => (
            <option key={trainer.id} value={trainer.id}>
              {trainer.trainerProfile?.displayName ?? trainer.email}
            </option>
          ))}
        </select>
      </label>
      {selected ? (
        <p>
          {selected._count.authoredCourses} Kurse · {selected._count.authoredVideos} Videos ·{' '}
          {profile.published ? 'Veröffentlicht' : 'Entwurf'}
        </p>
      ) : null}
      {selected ? (
        <form onSubmit={save} style={{ display: 'grid', gap: 14 }}>
          <Field
            label="Anzeigename"
            value={profile.displayName}
            set={(displayName) => setProfile({ ...profile, displayName })}
          />
          <Field
            label="Slug"
            value={profile.slug}
            set={(slug) => setProfile({ ...profile, slug })}
          />
          <Field
            label="Foto-URL"
            value={profile.photoUrl ?? ''}
            set={(photoUrl) => setProfile({ ...profile, photoUrl: photoUrl || undefined })}
          />
          <TextArea
            label="Biografie"
            value={profile.biography}
            set={(biography) => setProfile({ ...profile, biography })}
          />
          <TextArea
            label="Weg als Athlet"
            value={profile.athleteJourney}
            set={(athleteJourney) => setProfile({ ...profile, athleteJourney })}
          />
          <TextArea
            label="Wettkampferfahrung und Analysen"
            value={profile.competitionExperience ?? ''}
            set={(competitionExperience) => setProfile({ ...profile, competitionExperience })}
          />
          <TextArea
            label="Trainingsprinzipien"
            value={profile.trainingPrinciples}
            set={(trainingPrinciples) => setProfile({ ...profile, trainingPrinciples })}
          />
          <Field
            label="Stadt"
            value={profile.city}
            set={(city) => setProfile({ ...profile, city })}
          />
          <Field
            label="Lokale Verfügbarkeit"
            value={profile.localAvailability ?? ''}
            set={(localAvailability) => setProfile({ ...profile, localAvailability })}
          />
          <CsvField
            label="Qualifikationen"
            value={profile.qualifications}
            set={(qualifications) => setProfile({ ...profile, qualifications })}
          />
          <CsvField
            label="Meilensteine"
            value={profile.achievements}
            set={(achievements) => setProfile({ ...profile, achievements })}
          />
          <CsvField
            label="Sprachen"
            value={profile.languages}
            set={(languages) => setProfile({ ...profile, languages })}
          />
          <label>
            Disziplinen
            <select
              multiple
              value={profile.disciplines}
              onChange={(event) =>
                setProfile({
                  ...profile,
                  disciplines: Array.from(event.target.selectedOptions, (option) => option.value),
                })
              }
            >
              <option value="BJJ_GI">BJJ Gi</option>
              <option value="NO_GI_GRAPPLING">No-Gi Grappling</option>
            </select>
          </label>
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="submit">Entwurf speichern</button>
            <button
              type="button"
              onClick={() => void publication(profile.published ? 'unpublish' : 'publish')}
            >
              {profile.published ? 'Veröffentlichung zurückziehen' : 'Profil veröffentlichen'}
            </button>
          </div>
          <ContentAssignments
            title="Kurse dieses Athleten"
            items={courses}
            trainerId={selectedId}
            assign={(id, assigned) => void assignAuthor('course', id, assigned)}
          />
          <ContentAssignments
            title="Videos dieses Athleten"
            items={videos}
            trainerId={selectedId}
            assign={(id, assigned) => void assignAuthor('video', id, assigned)}
          />
        </form>
      ) : (
        <p>Es gibt noch keinen Benutzer mit der Rolle Trainer.</p>
      )}
      {message ? <p role="status">{message}</p> : null}
    </main>
  );
}

function ContentAssignments({
  title,
  items,
  trainerId,
  assign,
}: {
  title: string;
  items: AuthoredContent[];
  trainerId: string;
  assign(id: string, assigned: boolean): void;
}) {
  return (
    <fieldset>
      <legend>{title}</legend>
      {items.length ? (
        items.map((item) => {
          const checked = item.trainerId === trainerId;
          return (
            <label key={item.id} style={{ display: 'block' }}>
              <input
                type="checkbox"
                checked={checked}
                onChange={(event) => assign(item.id, event.target.checked)}
              />{' '}
              {item.title}
            </label>
          );
        })
      ) : (
        <p>Noch keine Inhalte vorhanden.</p>
      )}
    </fieldset>
  );
}

function Field({ label, value, set }: { label: string; value: string; set(value: string): void }) {
  return (
    <label>
      {label}
      <input value={value} onChange={(event) => set(event.target.value)} />
    </label>
  );
}

function TextArea({
  label,
  value,
  set,
}: {
  label: string;
  value: string;
  set(value: string): void;
}) {
  return (
    <label>
      {label}
      <textarea rows={5} value={value} onChange={(event) => set(event.target.value)} />
    </label>
  );
}

function CsvField({
  label,
  value,
  set,
}: {
  label: string;
  value: string[];
  set(value: string[]): void;
}) {
  return (
    <Field
      label={`${label} (durch Komma getrennt)`}
      value={value.join(', ')}
      set={(next) =>
        set(
          next
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
        )
      }
    />
  );
}
