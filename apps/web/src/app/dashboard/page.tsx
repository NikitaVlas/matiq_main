'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Course,
  Discipline,
  Roadmap,
  VideoHistoryItem,
  selectDashboardContent,
} from '../../features/dashboard/dashboard-state';
import { userApiResponse } from '../../shared/api/client';
import { TrainerFinanceDashboard } from '../../features/trainer-finance/TrainerFinanceDashboard';

type AssessmentResult = {
  completed: boolean;
  foundationActive: boolean;
  roadmaps: Roadmap[];
};

type Subscription = {
  status: string;
  hasAccess: boolean;
  endsAt?: string;
  graceEndsAt?: string;
};

export default function DashboardPage() {
  const [account, setAccount] = useState<{ role: string }>();
  const [assessment, setAssessment] = useState<AssessmentResult>();
  const [subscription, setSubscription] = useState<Subscription>();
  const [history, setHistory] = useState<VideoHistoryItem[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline>();
  const [error, setError] = useState('');

  useEffect(() => {
    userApiResponse('/auth/me')
      .then(async (accountResponse) => {
        if (!accountResponse.ok) throw new Error('AUTH_REQUIRED');
        const accountValue = (await accountResponse.json()) as { role: string };
        setAccount(accountValue);
        if (accountValue.role === 'TRAINER') return;
        return Promise.all([
          userApiResponse('/assessment/result'),
          userApiResponse('/subscription'),
          userApiResponse('/content/history'),
          userApiResponse('/content/courses'),
        ]).then(
          async ([assessmentResponse, subscriptionResponse, historyResponse, coursesResponse]) => {
            if (!assessmentResponse.ok) throw new Error('AUTH_REQUIRED');
            const assessmentValue = (await assessmentResponse.json()) as AssessmentResult;
            setAssessment(assessmentValue);
            setSelectedDiscipline(assessmentValue.roadmaps[0]?.discipline);
            setSubscription(
              subscriptionResponse.ok
                ? ((await subscriptionResponse.json()) as Subscription)
                : { status: 'NONE', hasAccess: false },
            );
            setHistory(
              historyResponse.ok ? ((await historyResponse.json()) as VideoHistoryItem[]) : [],
            );
            setCourses(coursesResponse.ok ? ((await coursesResponse.json()) as Course[]) : []);
          },
        );
      })
      .catch(() =>
        setError('Dein Dashboard konnte nicht geladen werden. Bitte melde dich erneut an.'),
      );
  }, []);

  const content = useMemo(
    () => selectDashboardContent(assessment?.roadmaps ?? [], selectedDiscipline, history, courses),
    [assessment?.roadmaps, selectedDiscipline, history, courses],
  );

  if (account?.role === 'TRAINER') return <TrainerFinanceDashboard />;

  if (error) {
    return (
      <main className="dashboard-page">
        <section className="dashboard-empty">
          <p className="error">{error}</p>
          <Link className="action-link" href="/login">
            Anmelden
          </Link>
        </section>
      </main>
    );
  }

  if (!account || !assessment || !subscription) return <DashboardSkeleton />;

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Dein Training</p>
          <h1>DEIN NÄCHSTER SCHRITT</h1>
        </div>
        <AccessStatus subscription={subscription} />
      </header>

      {!assessment.completed && !assessment.foundationActive ? (
        <section className="dashboard-empty">
          <p className="eyebrow">Roadmap vorbereiten</p>
          <h2>Beginne mit deinem Assessment</h2>
          <p>
            Beantworte die Fragen, damit MATIQ deinen ersten persönlichen Trainingsweg erstellt.
          </p>
          <Link className="action-link" href="/assessment">
            Assessment starten
          </Link>
        </section>
      ) : (
        <>
          {assessment.foundationActive ? <FoundationNotice /> : null}
          <DisciplineSwitch
            roadmaps={assessment.roadmaps}
            selected={selectedDiscipline}
            onSelect={setSelectedDiscipline}
          />
          <div className="dashboard-layout">
            <div className="dashboard-main-column">
              <NextStep roadmap={content.roadmap} hasAccess={subscription.hasAccess} />
              <ContinueWatching item={content.continueVideo} />
              <CourseSection title="Für deine Disziplin" courses={content.recommendedCourses} />
            </div>
            <aside className="dashboard-side-column">
              <RoadmapProgress roadmap={content.roadmap} />
              <VideoRecommendations videos={content.suggestedVideos} />
              <CourseSection title="Neu bei MATIQ" courses={content.newCourses} compact />
            </aside>
          </div>
        </>
      )}
    </main>
  );
}

function FoundationNotice() {
  return (
    <section className="dashboard-foundation-note">
      <div>
        <p className="eyebrow">Unsere Empfehlung</p>
        <h2>Konzentriere dich zuerst auf die Grundlagen</h2>
        <p>
          Baue sichere Bewegungen, Escapes und Positionsverständnis auf. Deine persönlichen Ziele
          kannst du trotzdem jederzeit ergänzen.
        </p>
      </div>
      <div className="dashboard-actions">
        <Link className="action-link" href="/roadmap">
          Grundlagen starten
        </Link>
        <Link className="text-link" href="/assessment">
          Assessment trotzdem starten
        </Link>
      </div>
    </section>
  );
}

function DisciplineSwitch({
  roadmaps,
  selected,
  onSelect,
}: {
  roadmaps: Roadmap[];
  selected?: Discipline;
  onSelect: (discipline: Discipline) => void;
}) {
  if (roadmaps.length < 2) return null;
  return (
    <nav className="dashboard-tabs" aria-label="Disziplin auswählen">
      {roadmaps.map((roadmap) => (
        <button
          key={roadmap.discipline}
          type="button"
          aria-pressed={selected === roadmap.discipline}
          onClick={() => onSelect(roadmap.discipline)}
        >
          {disciplineLabel(roadmap.discipline)}
        </button>
      ))}
    </nav>
  );
}

function NextStep({ roadmap, hasAccess }: { roadmap?: Roadmap; hasAccess: boolean }) {
  const next = roadmap?.items[0];
  const video = next?.videos[0];
  if (!next) {
    return (
      <section className="dashboard-feature dashboard-complete">
        <p className="eyebrow">Roadmap</p>
        <h2>Alle aktuellen Schritte abgeschlossen</h2>
        <p>Du kannst deine Roadmap prüfen oder weitere Videos entdecken.</p>
        <Link className="action-link" href="/roadmap">
          Roadmap öffnen
        </Link>
      </section>
    );
  }
  return (
    <section className="dashboard-feature">
      <p className="eyebrow">Als Nächstes in deiner Roadmap</p>
      <h2>{next.title}</h2>
      <p>
        {video
          ? `Empfohlenes Video: ${video.title}`
          : 'Wähle ein passendes Video für diesen Schritt.'}
      </p>
      <div className="dashboard-actions">
        <Link
          className="action-link"
          href={video && hasAccess ? `/video/${video.id}` : hasAccess ? '/videos' : '/subscription'}
        >
          {hasAccess ? 'Training fortsetzen' : 'Zugang freischalten'}
        </Link>
        <Link className="text-link" href="/roadmap">
          Roadmap ansehen
        </Link>
      </div>
    </section>
  );
}

function ContinueWatching({ item }: { item?: VideoHistoryItem }) {
  if (!item) return null;
  return (
    <section className="dashboard-row">
      <div>
        <p className="eyebrow">Weiter ansehen</p>
        <h2>{item.video.title}</h2>
      </div>
      <Link className="action-link secondary-action" href={`/video/${item.video.id}`}>
        Weiter bei {formatTime(item.watchedSeconds)}
      </Link>
    </section>
  );
}

function RoadmapProgress({ roadmap }: { roadmap?: Roadmap }) {
  if (!roadmap) return null;
  const total = roadmap.items.length + roadmap.completedItems.length;
  return (
    <section className="dashboard-panel">
      <p className="eyebrow">Roadmap Fortschritt</p>
      <strong className="dashboard-metric">
        {roadmap.completedItems.length}/{total}
      </strong>
      <p>Schritte abgeschlossen. Das ist kein Nachweis für die Beherrschung einer Technik.</p>
      <Link className="text-link" href="/roadmap">
        Details öffnen
      </Link>
    </section>
  );
}

function VideoRecommendations({ videos }: { videos: { id: string; title: string }[] }) {
  if (!videos.length) return null;
  return (
    <section className="dashboard-panel">
      <h2>Passende Videos</h2>
      <div className="dashboard-link-list">
        {videos.map((video) => (
          <Link key={video.id} href={`/video/${video.id}`}>
            {video.title}
          </Link>
        ))}
      </div>
    </section>
  );
}

function CourseSection({
  title,
  courses,
  compact = false,
}: {
  title: string;
  courses: Course[];
  compact?: boolean;
}) {
  if (!courses.length) return null;
  return (
    <section className={compact ? 'dashboard-panel' : 'dashboard-courses'}>
      <h2>{title}</h2>
      <div className={compact ? 'dashboard-link-list' : 'dashboard-course-grid'}>
        {courses.map((course) => (
          <article key={course.id}>
            <p>{disciplineLabel(course.discipline)}</p>
            <h3>{course.title}</h3>
            {!compact && course.description ? <p>{course.description}</p> : null}
            <Link className="text-link" href={`/courses/${course.id}`}>
              Kurs öffnen
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

function AccessStatus({ subscription }: { subscription: Subscription }) {
  const details = accessDetails(subscription);
  return (
    <section className="dashboard-access" aria-label="Mitgliedschaftsstatus">
      <span>{details.label}</span>
      <strong>{details.detail}</strong>
      <Link href="/subscription">Mitgliedschaft verwalten</Link>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <main className="dashboard-page" aria-busy="true" aria-label="Dashboard wird geladen">
      <div className="dashboard-skeleton dashboard-skeleton-title" />
      <div className="dashboard-layout">
        <div className="dashboard-skeleton dashboard-skeleton-feature" />
        <div className="dashboard-skeleton dashboard-skeleton-panel" />
      </div>
    </main>
  );
}

function accessDetails(subscription: Subscription) {
  const date = subscription.endsAt
    ? new Intl.DateTimeFormat('de-DE').format(new Date(subscription.endsAt))
    : null;
  const labels: Record<string, string> = {
    ACTIVE: 'Mitgliedschaft aktiv',
    CANCEL_AT_PERIOD_END: 'Kündigung vorgemerkt',
    CANCELED: 'Mitgliedschaft beendet',
    EXPIRED: 'Zugang abgelaufen',
    PAST_DUE: 'Zahlung ausstehend',
    TRIAL: 'Testphase aktiv',
    NONE: 'Kein aktiver Zugang',
  };
  return {
    label: labels[subscription.status] ?? subscription.status,
    detail: date
      ? `Zugang bis ${date}`
      : subscription.hasAccess
        ? 'Zugang aktiv'
        : 'Videozugang gesperrt',
  };
}

function disciplineLabel(discipline: Discipline) {
  return discipline === 'BJJ_GI' ? 'BJJ Gi' : 'No-Gi Grappling';
}

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
