'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '../../shared/api/client';

type Course = { id: string; key: string; title: string; description?: string; published: boolean; modules: { id: string; title: string; position: number; lessons: { id: string; title: string; position: number; published: boolean }[] }[] };

export default function CourseBuilderPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [title, setTitle] = useState('');
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const load = async () => { const response = await adminApi('/admin/content/courses'); if (response.ok) setCourses(await response.json()); else setError('Не удалось загрузить курсы'); };
  useEffect(() => { void load(); }, []);
  const create = async (event: React.FormEvent) => { event.preventDefault(); setError(''); const response = await adminApi('/admin/content/courses', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key, title, discipline: 'NO_GI_GRAPPLING' }) }); if (!response.ok) { setError('Не удалось создать курс'); return; } setTitle(''); setKey(''); await load(); };
  return <main style={{ maxWidth: 960, margin: '40px auto', padding: 24 }}><h1>MATIQ Content Builder</h1><p>Курсы состоят из атомарных уроков и веток реакций.</p><form onSubmit={create} style={{ display: 'flex', gap: 8, margin: '24px 0' }}><input required placeholder="key" value={key} onChange={e => setKey(e.target.value)} /><input required placeholder="Название курса" value={title} onChange={e => setTitle(e.target.value)} /><button type="submit">Создать курс</button></form>{error && <p role="alert">{error}</p>}<section>{courses.map(course => <article key={course.id} style={{ border: '1px solid #ddd', padding: 16, marginBottom: 12 }}><h2>{course.title}</h2><small>{course.key} · {course.published ? 'published' : 'draft'}</small>{course.modules.map(module => <div key={module.id}><h3>{module.position + 1}. {module.title}</h3><ul>{module.lessons.map(lesson => <li key={lesson.id}>{lesson.position + 1}. {lesson.title} {lesson.published ? '✓' : '(draft)'}</li>)}</ul></div>)}</article>)}</section></main>;
}