'use client';

import { FormEvent, useEffect, useState } from 'react';
import { adminApi } from '../../shared/api/client';

type Step = {
  id: string;
  key: string;
  title: string;
  description?: string | null;
  skillKey: string;
  position: number;
  active: boolean;
};
type Template = {
  id: string;
  name: string;
  discipline: string;
  active: boolean;
  minExperienceMonths: number;
  maxExperienceMonths: number;
  steps: Step[];
};

export default function FoundationAdminPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [status, setStatus] = useState('');

  const load = async () => {
    const response = await adminApi('/admin/assessment/foundation-templates');
    if (!response.ok) return setStatus('Foundation templates could not be loaded.');
    setTemplates(await response.json());
  };
  useEffect(() => void load(), []);

  const saveStep = async (templateId: string, step: Step) => {
    setStatus('Saving...');
    const response = await adminApi(`/admin/assessment/foundation-steps/${step.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(step),
    });
    setStatus(response.ok ? 'Saved.' : 'Save failed.');
    if (response.ok) await load();
  };

  const addStep = async (event: FormEvent<HTMLFormElement>, templateId: string) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await adminApi(`/admin/assessment/foundation-templates/${templateId}/steps`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        key: data.get('key'),
        title: data.get('title'),
        skillKey: data.get('skillKey'),
        description: data.get('description'),
        position: Number(data.get('position')),
      }),
    });
    setStatus(response.ok ? 'Step added.' : 'Add failed.');
    if (response.ok) {
      event.currentTarget.reset();
      await load();
    }
  };

  const change = (templateId: string, stepId: string, patch: Partial<Step>) =>
    setTemplates((current) =>
      current.map((template) =>
        template.id === templateId
          ? {
              ...template,
              steps: template.steps.map((step) =>
                step.id === stepId ? { ...step, ...patch } : step,
              ),
            }
          : template,
      ),
    );

  return (
    <main style={{ maxWidth: 1000, margin: '40px auto', padding: 24 }}>
      <p>
        <a href="/">← Content administration</a>
      </p>
      <h1>Beginner Foundation Roadmap</h1>
      <p>
        Ordered fundamentals assigned to white belts with no more than six months of experience.
      </p>
      {status ? <p role="status">{status}</p> : null}
      {templates.map((template) => (
        <section key={template.id} style={{ borderTop: '2px solid #111', marginTop: 32 }}>
          <h2>
            {template.name} · {template.discipline}
          </h2>
          <p>
            Eligibility: {template.minExperienceMonths}–{template.maxExperienceMonths} months
          </p>
          {template.steps.map((step) => (
            <div
              key={step.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '60px 1fr 1fr 90px 90px',
                gap: 8,
                marginBottom: 8,
              }}
            >
              <input
                aria-label={`${step.title} position`}
                type="number"
                min="0"
                max="200"
                value={step.position}
                onChange={(event) =>
                  change(template.id, step.id, { position: Number(event.target.value) })
                }
              />
              <input
                aria-label={`${step.title} title`}
                value={step.title}
                onChange={(event) => change(template.id, step.id, { title: event.target.value })}
              />
              <input
                aria-label={`${step.title} topic`}
                value={step.skillKey}
                onChange={(event) => change(template.id, step.id, { skillKey: event.target.value })}
              />
              <label>
                <input
                  type="checkbox"
                  checked={step.active}
                  onChange={(event) =>
                    change(template.id, step.id, { active: event.target.checked })
                  }
                />{' '}
                Active
              </label>
              <button type="button" onClick={() => void saveStep(template.id, step)}>
                Save
              </button>
            </div>
          ))}
          <form
            onSubmit={(event) => void addStep(event, template.id)}
            style={{ display: 'grid', gap: 8, marginTop: 20 }}
          >
            <h3>Add step</h3>
            <input name="key" placeholder="stable-key" pattern="[a-z0-9-]+" required />
            <input name="title" placeholder="Display title" maxLength={160} required />
            <input name="skillKey" placeholder="Roadmap topic key" pattern="[a-z0-9-]+" required />
            <input name="description" placeholder="Training focus" maxLength={500} />
            <input name="position" type="number" min="0" max="200" required />
            <button>Add foundation step</button>
          </form>
        </section>
      ))}
    </main>
  );
}
