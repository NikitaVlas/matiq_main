'use client';

import { FormEvent, useEffect, useState } from 'react';
const api = process.env.NEXT_PUBLIC_USER_API_URL ?? 'http://localhost:4000';
type Question = {
  key: string;
  text: string;
  context: string;
  options: { key: string; label: string }[];
};

export default function AssessmentPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [roadmap, setRoadmap] = useState<{ title: string; score?: number }[]>([]);
  useEffect(() => {
    fetch(`${api}/assessment/questions`, { credentials: 'include' })
      .then((r) => r.json())
      .then(setQuestions);
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const response = await fetch(`${api}/assessment/submit`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        answers: Object.entries(answers).map(([questionKey, optionKey]) => ({
          questionKey,
          optionKey,
        })),
      }),
    });
    const result = await response.json();
    setRoadmap((result.roadmap ?? []).map((item: { title: string }) => ({ title: item.title })));
    setDone(true);
  }
  if (done)
    return (
      <main>
        <section className="shell">
          <p className="eyebrow">Deine Roadmap</p>
          <h2>Dein nächster Entwicklungsschritt</h2>
          <p>Die Empfehlungen basieren auf deinen Antworten und können später erweitert werden.</p>
          <div className="roadmap">
            {roadmap.map((item) => (
              <article key={item.title}>
                <strong>{item.title}</strong>
                <span>Empfohlen</span>
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
        <h2>Wie arbeitest du heute?</h2>
        <p>Wähle die Antwort, die deine aktuelle Erfahrung am besten beschreibt.</p>
        <form onSubmit={submit}>
          {questions.map((question) => (
            <fieldset key={question.key}>
              <legend>{question.text}</legend>
              {question.options.map((option) => (
                <label className="choice" key={option.key}>
                  <input
                    type="radio"
                    name={question.key}
                    required
                    checked={answers[question.key] === option.key}
                    onChange={() => setAnswers({ ...answers, [question.key]: option.key })}
                  />
                  {option.label}
                </label>
              ))}
            </fieldset>
          ))}
          <button disabled={!questions.length}>Assessment abschließen</button>
        </form>
      </section>
    </main>
  );
}
