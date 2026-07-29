'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';

const api = process.env.NEXT_PUBLIC_USER_API_URL ?? 'http://localhost:4000';

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
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [roadmap, setRoadmap] = useState<
    { id: string; title: string; recommendationType: 'CORE' | 'GAP' | 'EXPLORE' }[]
  >([]);

  useEffect(() => {
    Promise.all([
      fetch(`${api}/assessment/questions`, { credentials: 'include' }),
      fetch(`${api}/assessment/answers`, { credentials: 'include' }),
    ])
      .then(async ([questionsResponse, answersResponse]) => {
        if (!questionsResponse.ok || !answersResponse.ok) throw new Error('ASSESSMENT_LOAD_FAILED');
        const loadedQuestions = (await questionsResponse.json()) as Question[];
        const saved = (await answersResponse.json()) as {
          completed: boolean;
          answers: SavedAnswer[];
        };
        const selected: Record<string, string[]> = {};
        const custom: Record<string, string> = {};
        for (const answer of saved.answers) {
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
      })
      .catch(() => setError('Das Assessment konnte nicht geladen werden.'));
  }, []);

  const select = (question: Question, optionKey: string, checked: boolean) => {
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
    const missing = questions.find(
      (question) => !(answers[question.key]?.length || customAnswers[question.key]?.trim()),
    );
    if (missing) {
      setError(`Bitte beantworte: ${missing.text}`);
      return;
    }
    setSaving(true);
    try {
      const payload = questions.flatMap((question) => {
        const customText = customAnswers[question.key]?.trim();
        return [
          ...(answers[question.key] ?? []).map((optionKey) => ({
            questionKey: question.key,
            optionKey,
          })),
          ...(customText ? [{ questionKey: question.key, customText }] : []),
        ];
      });
      const response = await fetch(`${api}/assessment/submit`, {
        method: 'POST',
        credentials: 'include',
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
        {error && <p role="alert">{error}</p>}
        <form onSubmit={submit}>
          {questions.map((question) => (
            <fieldset key={question.key}>
              <legend>{question.text}</legend>
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
                    onChange={(event) =>
                      setCustomAnswers((current) => ({
                        ...current,
                        [question.key]: event.target.value,
                      }))
                    }
                  />
                </label>
              )}
            </fieldset>
          ))}
          <button disabled={!questions.length || saving}>
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

function recommendationLabel(type: 'CORE' | 'GAP' | 'EXPLORE') {
  return { CORE: 'Dein Spiel', GAP: 'Entwicklungslücke', EXPLORE: 'Neues Ziel' }[type];
}
