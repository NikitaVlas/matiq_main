'use client';

import { FormEvent, useEffect, useState } from 'react';
import { adminApi } from '../../shared/api/client';

type Kind = 'CONFIDENCE' | 'PREFERENCE' | 'GOAL';
type Context = 'STANDING' | 'TOP' | 'BOTTOM';
type Option = {
  key: string;
  label: string;
  value: number;
  skillKey?: string;
  recommendationType?: 'CORE' | 'GAP' | 'EXPLORE';
};
type Question = {
  id: string;
  key: string;
  text: string;
  context: Context;
  skillKey: string;
  kind: Kind;
  multiple: boolean;
  allowCustom: boolean;
  active: boolean;
  options: Option[];
};
type QuestionDraft = Omit<Question, 'id' | 'active'>;
type Unmapped = { id: string; customText: string; question: { text: string } };

const emptyOption = (): Option => ({ key: '', label: '', value: 3 });
const emptyQuestion = (): QuestionDraft => ({
  key: '',
  text: '',
  context: 'TOP',
  skillKey: '',
  kind: 'CONFIDENCE',
  multiple: false,
  allowCustom: false,
  options: [emptyOption()],
});

export default function AssessmentAdminPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [unmapped, setUnmapped] = useState<Unmapped[]>([]);
  const [draft, setDraft] = useState(emptyQuestion());
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [status, setStatus] = useState('');

  const load = async () => {
    const [questionResponse, unmappedResponse] = await Promise.all([
      adminApi('/admin/assessment/questions'),
      adminApi('/admin/assessment/unmapped-answers'),
    ]);
    if (!questionResponse.ok || !unmappedResponse.ok)
      return setStatus('Assessment data could not be loaded.');
    setQuestions(await questionResponse.json());
    setUnmapped(await unmappedResponse.json());
  };
  useEffect(() => {
    void load();
  }, []);

  const save = async (path: string, method: 'POST' | 'PATCH', body: unknown) => {
    setStatus('Saving...');
    const response = await adminApi(path, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      setStatus(`Save failed (HTTP ${response.status}): ${await response.text()}`);
      return false;
    }
    setStatus('Saved.');
    await load();
    return true;
  };

  return (
    <main style={{ maxWidth: 1000, margin: '40px auto', padding: 24 }}>
      <nav>
        <a href="/">Courses</a> - <a href="/videos">Videos</a> - <strong>Assessment</strong>
      </nav>
      <h1>Assessment management</h1>
      <p>Confidence finds gaps, Preference builds the core game, and Goal adds areas to explore.</p>
      {status && <p role="status">{status}</p>}

      <section>
        <h2>Create question</h2>
        <form
          onSubmit={async (event: FormEvent) => {
            event.preventDefault();
            if (await save('/admin/assessment/questions', 'POST', draft)) setDraft(emptyQuestion());
          }}
        >
          <QuestionFields value={draft} onChange={setDraft} />
          <button>Create question</button>
        </form>
      </section>

      <section>
        <h2>Existing questions</h2>
        {questions.map((question) => (
          <QuestionEditor key={question.id} question={question} save={save} />
        ))}
      </section>

      <section>
        <h2>Answers waiting for mapping</h2>
        <p>They do not influence a Roadmap until an administrator assigns a topic key.</p>
        {!unmapped.length && <p>No unmapped answers.</p>}
        {unmapped.map((answer) => (
          <article key={answer.id} style={{ border: '1px solid #ddd', padding: 12, marginTop: 8 }}>
            <strong>{answer.customText}</strong>
            <p>{answer.question.text}</p>
            <input
              aria-label={`Topic for ${answer.customText}`}
              placeholder="Roadmap topic key"
              value={mapping[answer.id] ?? ''}
              onChange={(event) =>
                setMapping((current) => ({ ...current, [answer.id]: event.target.value }))
              }
            />
            <button
              disabled={!mapping[answer.id]?.trim()}
              onClick={() =>
                void save(`/admin/assessment/unmapped-answers/${answer.id}/map`, 'PATCH', {
                  skillKey: mapping[answer.id]?.trim(),
                })
              }
            >
              Map answer
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}

function QuestionEditor({
  question,
  save,
}: {
  question: Question;
  save: (path: string, method: 'POST' | 'PATCH', body: unknown) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(question);
  useEffect(() => setDraft(question), [question]);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save(`/admin/assessment/questions/${question.id}`, 'PATCH', draft);
      }}
      style={{ border: '1px solid #ddd', padding: 16, marginTop: 12 }}
    >
      <strong>{question.key}</strong>
      <QuestionFields value={draft} onChange={setDraft} hideKey />
      <label>
        <input
          type="checkbox"
          checked={draft.active}
          onChange={(event) => setDraft({ ...draft, active: event.target.checked })}
        />{' '}
        Active
      </label>
      <button>Save question</button>
    </form>
  );
}

function QuestionFields<T extends QuestionDraft>({
  value,
  onChange,
  hideKey = false,
}: {
  value: T;
  onChange: (value: T) => void;
  hideKey?: boolean;
}) {
  const patch = (change: Partial<T>) => onChange({ ...value, ...change });
  const option = (index: number, change: Partial<Option>) =>
    patch({
      options: value.options.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...change } : item,
      ),
    } as Partial<T>);
  return (
    <fieldset>
      <legend>Question definition</legend>
      {!hideKey && (
        <label>
          Stable key{' '}
          <input
            required
            pattern="[a-z0-9-]+"
            value={value.key}
            onChange={(event) => patch({ key: event.target.value } as Partial<T>)}
          />
        </label>
      )}
      <label>
        Athlete-facing question{' '}
        <input
          required
          maxLength={240}
          value={value.text}
          onChange={(event) => patch({ text: event.target.value } as Partial<T>)}
        />
      </label>
      <label>
        Purpose{' '}
        <select
          value={value.kind}
          onChange={(event) => {
            const kind = event.target.value as Kind;
            const recommendationType = kind === 'PREFERENCE' ? 'CORE' : 'EXPLORE';
            patch({
              kind,
              options: value.options.map((item) => ({
                ...item,
                ...(kind === 'CONFIDENCE'
                  ? { skillKey: undefined, recommendationType: undefined }
                  : { recommendationType }),
              })),
            } as Partial<T>);
          }}
        >
          <option value="CONFIDENCE">Confidence / gap</option>
          <option value="PREFERENCE">Preferred game / core</option>
          <option value="GOAL">Goal / explore</option>
        </select>
      </label>
      <label>
        Context{' '}
        <select
          value={value.context}
          onChange={(event) => patch({ context: event.target.value as Context } as Partial<T>)}
        >
          <option value="STANDING">Standing</option>
          <option value="TOP">Top</option>
          <option value="BOTTOM">Bottom</option>
        </select>
      </label>
      <label>
        Default Roadmap topic key{' '}
        <input
          required
          pattern="[a-z0-9-]+"
          value={value.skillKey}
          onChange={(event) => patch({ skillKey: event.target.value } as Partial<T>)}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={value.multiple}
          onChange={(event) => patch({ multiple: event.target.checked } as Partial<T>)}
        />{' '}
        Multiple choices
      </label>
      <label>
        <input
          type="checkbox"
          checked={value.allowCustom}
          onChange={(event) => patch({ allowCustom: event.target.checked } as Partial<T>)}
        />{' '}
        Allow custom unmapped answer
      </label>
      <h4>Answer options</h4>
      {value.options.map((item, index) => (
        <div key={index} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <input
            required
            pattern="[a-z0-9-]+"
            placeholder="key"
            value={item.key}
            onChange={(event) => option(index, { key: event.target.value })}
          />
          <input
            required
            placeholder="label"
            value={item.label}
            onChange={(event) => option(index, { label: event.target.value })}
          />
          <input
            aria-label="score"
            type="number"
            min={0}
            max={5}
            value={item.value}
            onChange={(event) => option(index, { value: Number(event.target.value) })}
          />
          {value.kind !== 'CONFIDENCE' && (
            <>
              <input
                required
                pattern="[a-z0-9-]+"
                placeholder="Roadmap topic key"
                value={item.skillKey ?? ''}
                onChange={(event) => option(index, { skillKey: event.target.value })}
              />
              <select
                value={
                  item.recommendationType ?? (value.kind === 'PREFERENCE' ? 'CORE' : 'EXPLORE')
                }
                onChange={(event) =>
                  option(index, {
                    recommendationType: event.target.value as Option['recommendationType'],
                  })
                }
              >
                <option value="CORE">Core</option>
                <option value="GAP">Gap</option>
                <option value="EXPLORE">Explore</option>
              </select>
            </>
          )}
          <button
            type="button"
            disabled={value.options.length === 1}
            onClick={() =>
              patch({
                options: value.options.filter((_, itemIndex) => itemIndex !== index),
              } as Partial<T>)
            }
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => patch({ options: [...value.options, emptyOption()] } as Partial<T>)}
      >
        Add option
      </button>
    </fieldset>
  );
}
