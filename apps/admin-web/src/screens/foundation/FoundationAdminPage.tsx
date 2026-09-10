'use client';
import { t, useAdminLanguage } from '../../shared/i18n';
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
type RoadmapTopic = { id: string; key: string; name: string; publishedVideoCount: number };

const slug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export default function FoundationAdminPage() {
  useAdminLanguage();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [topics, setTopics] = useState<RoadmapTopic[]>([]);
  const [status, setStatus] = useState('');

  const load = async () => {
    const [templatesResponse, topicsResponse] = await Promise.all([
      adminApi('/admin/assessment/foundation-templates'),
      adminApi('/admin/content/roadmap-topic-coverage'),
    ]);
    if (!templatesResponse.ok || !topicsResponse.ok)
      return setStatus('Foundation data could not be loaded.');
    setTemplates(await templatesResponse.json());
    setTopics(await topicsResponse.json());
  };
  useEffect(() => void load(), []);

  const saveStep = async (step: Step) => {
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
    const title = String(data.get('title') ?? '');
    const template = templates.find((item) => item.id === templateId);
    const position = Math.max(-1, ...(template?.steps.map((step) => step.position) ?? [])) + 1;
    const response = await adminApi(`/admin/assessment/foundation-templates/${templateId}/steps`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        key: slug(title),
        title,
        skillKey: data.get('skillKey'),
        description: data.get('description'),
        position,
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
        <a href="/">{t('← Content administration')} </a>
      </p>
      <h1>{t('Beginner Foundation Roadmap')} </h1>
      <p>
        {t(
          'Ordered fundamentals assigned to white belts with no more than six months of experience.',
        )}{' '}
      </p>
      {status ? <p role="status">{t(status)}</p> : null}
      {templates.map((template) => (
        <section key={template.id} style={{ borderTop: '2px solid #111', marginTop: 32 }}>
          <h2>
            {template.name} · {t(template.discipline)}
          </h2>
          <p>
            {t('Eligibility:')} {template.minExperienceMonths}–{template.maxExperienceMonths}{' '}
            {t('months')}{' '}
          </p>
          <div
            aria-hidden="true"
            style={{
              display: 'grid',
              gridTemplateColumns: '60px 1fr 1fr 90px 90px',
              gap: 8,
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            <span>{t('Order')} </span>
            <span>{t('Step title')} </span>
            <span>{t('Roadmap topic')} </span>
            <span>{t('Status')} </span>
            <span>{t('Action')} </span>
          </div>
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
                aria-label={t(`${step.title} position`)}
                type="number"
                min="0"
                max="200"
                value={step.position}
                onChange={(event) =>
                  change(template.id, step.id, { position: Number(event.target.value) })
                }
              />
              <input
                aria-label={t(`${step.title} title`)}
                value={step.title}
                onChange={(event) => change(template.id, step.id, { title: event.target.value })}
              />
              <select
                aria-label={t(`${step.title} topic`)}
                value={step.skillKey}
                onChange={(event) => change(template.id, step.id, { skillKey: event.target.value })}
              >
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.key}>
                    {topic.name}
                  </option>
                ))}
              </select>
              <label>
                <input
                  type="checkbox"
                  checked={step.active}
                  onChange={(event) =>
                    change(template.id, step.id, { active: event.target.checked })
                  }
                />{' '}
                {t('Active')}{' '}
              </label>
              <button type="button" onClick={() => void saveStep(step)}>
                {t('Save')}{' '}
              </button>
            </div>
          ))}
          <form
            onSubmit={(event) => void addStep(event, template.id)}
            style={{ display: 'grid', gap: 8, marginTop: 20 }}
          >
            <h3>{t('Add step')} </h3>
            <label>
              {t('Step title')}{' '}
              <input
                name="title"
                placeholder={t('For example: Closed Guard basics')}
                maxLength={160}
                required
              />
            </label>
            <label>
              {t('Roadmap topic')}{' '}
              <select name="skillKey" required defaultValue="">
                <option value="" disabled>
                  {t('Select what this step teaches')}{' '}
                </option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.key}>
                    {topic.name} ({topic.publishedVideoCount} {t('published videos)')}{' '}
                  </option>
                ))}
              </select>
            </label>
            <p>
              {t(
                'The Roadmap topic connects this step to matching courses and published videos.',
              )}{' '}
            </p>
            <label>
              {t('Training focus (optional)')}{' '}
              <textarea
                name="description"
                placeholder={t(
                  'Explain what the athlete should understand or practise in this step.',
                )}
                maxLength={500}
                rows={3}
              />
            </label>
            <button>{t('Add foundation step')} </button>
          </form>
        </section>
      ))}
    </main>
  );
}
