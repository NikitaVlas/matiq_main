'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { userApiResponse } from '../../shared/api/client';

type Question = {
  key: string;
  text: string;
  kind: 'CONFIDENCE' | 'PREFERENCE' | 'GOAL';
  multiple: boolean;
  allowCustom: boolean;
  options: { key: string; label: string }[];
};
type SavedAnswer = { questionKey: string; optionKey?: string; customText?: string };

export default function AssessmentPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [previouslyCompleted, setPreviouslyCompleted] = useState(false);
  const [draftDiscipline, setDraftDiscipline] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [missingQuestionKey, setMissingQuestionKey] = useState('');
  const [roadmap, setRoadmap] = useState<
    { id: string; title: string; recommendationType: 'CORE' | 'GAP' | 'EXPLORE' }[]
  >([]);

  useEffect(() => {
    Promise.all([
      userApiResponse('/assessment/questions'),
      userApiResponse('/assessment/answers'),
      userApiResponse('/athlete-profile'),
    ])
      .then(async ([questionsResponse, answersResponse, profileResponse]) => {
        if (!questionsResponse.ok || !answersResponse.ok || !profileResponse.ok)
          throw new Error('ASSESSMENT_LOAD_FAILED');
        const loadedQuestions = (await questionsResponse.json()) as Question[];
        const saved = (await answersResponse.json()) as {
          completed: boolean;
          answers: SavedAnswer[];
        };
        const profile = (await profileResponse.json()) as { disciplines: string[] };
        const discipline = profile.disciplines[0];
        const attemptResponse = discipline
          ? await userApiResponse(`/assessment/attempt/${encodeURIComponent(discipline)}`)
          : null;
        if (attemptResponse && !attemptResponse.ok) throw new Error('ASSESSMENT_LOAD_FAILED');
        const attempt = attemptResponse
          ? ((await attemptResponse.json()) as { answers?: SavedAnswer[] } | null)
          : null;
        const restoredAnswers = attempt?.answers?.length ? attempt.answers : saved.answers;
        const selected: Record<string, string[]> = {};
        const custom: Record<string, string> = {};
        for (const answer of restoredAnswers) {
          if (answer.optionKey)
            selected[answer.questionKey] = [
              ...(selected[answer.questionKey] ?? []),
              answer.optionKey,
            ];
          if (answer.customText) custom[answer.questionKey] = answer.customText;
        }
        setQuestions(loadedQuestions);
        setAnswers(selected);
        setCustomAnswers(custom);
        setPreviouslyCompleted(saved.completed);
        setDraftDiscipline(discipline ?? '');
        setHydrated(true);
      })
      .catch(() => setError('Das Assessment konnte nicht geladen werden.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!hydrated || !draftDiscipline || done) return;
    const payload = assessmentPayload(questions, answers, customAnswers);
    if (!payload.length) return;
    const timeout = window.setTimeout(() => {
      void userApiResponse('/assessment/draft', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ discipline: draftDiscipline, answers: payload }),
      })
        .then((response) => {
          if (!response.ok) setError('Der Zwischenstand konnte nicht gespeichert werden.');
        })
        .catch(() => setError('Der Zwischenstand konnte nicht gespeichert werden.'));
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [answers, customAnswers, done, draftDiscipline, hydrated, questions]);

  const select = (question: Question, optionKey: string, checked: boolean) => {
    setMissingQuestionKey('');
    setError('');
    setAnswers((current) => {
      if (!question.multiple) return { ...current, [question.key]: [optionKey] };
      const values = current[question.key] ?? [];
      return {
        ...current,
        [question.key]: checked
          ? [...new Set([...values, optionKey])]
          : values.filter((value) => value !== optionKey),
      };
    });
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMissingQuestionKey('');
    const missing = questions.find(
      (question) => !(answers[question.key]?.length || customAnswers[question.key]?.trim()),
    );
    if (missing) {
      setError(`Bitte beantworte: ${missing.text}`);
      setMissingQuestionKey(missing.key);
      requestAnimationFrame(() => {
        document.getElementById(`assessment-question-${missing.key}`)?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      });
      return;
    }
    setSaving(true);
    try {
      const payload = assessmentPayload(questions, answers, customAnswers);
      const response = await userApiResponse('/assessment/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ answers: payload }),
      });
      if (!response.ok) throw new Error(await response.text());
      const result = await response.json();
      setRoadmap(result.roadmap ?? []);
      setDone(true);
    } catch {
      setError('Das Assessment konnte nicht gespeichert werden. Bitte versuche es erneut.');
    } finally {
      setSaving(false);
    }
  }

  if (done)
    return (
      <main>
        <section className="shell">
          <p className="eyebrow">Deine Roadmap</p>
          <h2>Dein nächster Entwicklungsschritt</h2>
          <p>Deine Stärken, Ziele und Entwicklungslücken wurden neu eingeordnet.</p>
          <div className="roadmap">
            {roadmap.map((item) => (
              <article key={item.id}>
                <Link className="roadmap-title-link" href={`/roadmap/${item.id}`}>
                  <strong>{item.title}</strong>
                </Link>
                <span>{recommendationLabel(item.recommendationType)}</span>
              </article>
            ))}
          </div>
          <a href="/dashboard">Zum Dashboard</a>
        </section>
      </main>
    );

  return (
    <main>
      <section className="shell">
        <p className="eyebrow">Assessment</p>
        <h2>{previouslyCompleted ? 'Assessment aktualisieren' : 'Wie kämpfst du heute?'}</h2>
        <p>
          Zeige uns nicht nur Lücken, sondern auch dein bestehendes Spiel, deine Lieblingspositionen
          und deine nächsten Ziele.
        </p>
        {previouslyCompleted && (
          <p role="note">
            Änderungen am Assessment aktualisieren deine aktuelle Roadmap. Eigene Schritte,
            Reihenfolge und Fortschritt bleiben erhalten.
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {loading ? (
          <div className="assessment-skeleton" aria-label="Assessment wird geladen">
            <span />
            <span />
            <span />
          </div>
        ) : null}
        <form className="assessment-form" onSubmit={submit} aria-busy={saving}>
          {questions.map((question) => (
            <fieldset
              id={`assessment-question-${question.key}`}
              key={question.key}
              aria-invalid={missingQuestionKey === question.key}
              className={missingQuestionKey === question.key ? 'has-error' : undefined}
            >
              <legend>{question.text}</legend>
              {missingQuestionKey === question.key && (
                <p role="alert">
                  Bitte beantworte diese Frage, bevor du die Roadmap aktualisierst.
                </p>
              )}
              {question.multiple && <small>Mehrere Antworten sind möglich.</small>}
              {question.options.map((option) => {
                const checked = answers[question.key]?.includes(option.key) ?? false;
                return (
                  <label className="choice" key={option.key}>
                    <input
                      type={question.multiple ? 'checkbox' : 'radio'}
                      name={question.key}
                      checked={checked}
                      onChange={(event) => select(question, option.key, event.target.checked)}
                    />
                    {option.label}
                  </label>
                );
              })}
              {question.allowCustom && (
                <label>
                  Andere Position oder Technik
                  <input
                    maxLength={200}
                    placeholder="Wird zunächst manuell geprüft"
                    value={customAnswers[question.key] ?? ''}
                    onChange={(event) => {
                      setMissingQuestionKey('');
                      setError('');
                      setCustomAnswers((current) => ({
                        ...current,
                        [question.key]: event.target.value,
                      }));
                    }}
                  />
                </label>
              )}
            </fieldset>
          ))}
          <button className="assessment-submit" disabled={!questions.length || saving}>
            {saving
              ? 'Roadmap wird aktualisiert...'
              : previouslyCompleted
                ? 'Roadmap aktualisieren'
                : 'Assessment abschließen'}
          </button>
        </form>
      </section>
    </main>
  );
}

function assessmentPayload(
  questions: Question[],
  answers: Record<string, string[]>,
  customAnswers: Record<string, string>,
) {
  return questions.flatMap((question) => {
    const customText = customAnswers[question.key]?.trim();
    return [
      ...(answers[question.key] ?? []).map((optionKey) => ({
        questionKey: question.key,
        optionKey,
      })),
      ...(customText ? [{ questionKey: question.key, customText }] : []),
    ];
  });
}

function recommendationLabel(type: 'CORE' | 'GAP' | 'EXPLORE') {
  return { CORE: 'Dein Spiel', GAP: 'Entwicklungslücke', EXPLORE: 'Neues Ziel' }[type];
}
