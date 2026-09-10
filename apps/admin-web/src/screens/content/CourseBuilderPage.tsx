'use client';
import { t, useAdminLanguage } from '../../shared/i18n';
import type { AdminApiPath } from '@matiq/contracts';
import { FormEvent, useEffect, useState } from 'react';
import { adminApi } from '../../shared/api/client';

type Lesson = {
  id: string;
  title: string;
  position: number;
  published: boolean;
  video?: { id: string; title: string };
  outgoingRelations?: {
    id: string;
    toLessonId: string;
    type: 'PRIMARY' | 'BRANCH';
    trigger?: { id: string; name: string };
    toLesson: { id: string; title: string };
  }[];
};

type Course = {
  id: string;
  key: string;
  title: string;
  published: boolean;
  modules: { id: string; title: string; position: number; lessons: Lesson[] }[];
};

type Video = { id: string; title: string; published: boolean };
type BranchTrigger = { id: string; key: string; name: string };
type LessonDraft = { title: string; videoId: string };
type EditingTitle = { kind: 'course' | 'module' | 'lesson'; id: string; title: string };
type CourseValidation = {
  valid: boolean;
  issues: { code: string; message: string; lessonId?: string }[];
};

const ValidationReport = ({ title, report }: { title: string; report: CourseValidation }) => {
  useAdminLanguage();
  return (
    <section aria-label={t(`Validation report for ${title}`)}>
      <strong>
        {report.valid ? t('Course is ready to publish.') : t('Course cannot be published yet:')}
      </strong>
      {!report.valid && (
        <ul>
          {report.issues.map((issue, index) => (
            <li key={`${issue.code}-${issue.lessonId ?? index}`}>{t(issue.message)}</li>
          ))}
        </ul>
      )}
    </section>
  );
};

const slug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export default function CourseBuilderPage() {
  useAdminLanguage();
  const [courses, setCourses] = useState<Course[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [branchTriggers, setBranchTriggers] = useState<BranchTrigger[]>([]);
  const [selected, setSelected] = useState('');
  const [title, setTitle] = useState('');
  const [moduleTitle, setModuleTitle] = useState('');
  const [lessonDrafts, setLessonDrafts] = useState<Record<string, LessonDraft>>({});
  const [submittingModuleId, setSubmittingModuleId] = useState('');
  const [editingTitle, setEditingTitle] = useState<EditingTitle>();
  const [relationFrom, setRelationFrom] = useState('');
  const [editingRelationId, setEditingRelationId] = useState('');
  const [relationTarget, setRelationTarget] = useState('');
  const [relationType, setRelationType] = useState<'PRIMARY' | 'BRANCH'>('PRIMARY');
  const [relationTriggerId, setRelationTriggerId] = useState('');
  const [newTriggerName, setNewTriggerName] = useState('');
  const [error, setError] = useState('');
  const [validationReports, setValidationReports] = useState<Record<string, CourseValidation>>({});

  const load = async () => {
    const [coursesResponse, videosResponse, triggersResponse] = await Promise.all([
      adminApi('/admin/content/courses'),
      adminApi('/admin/videos'),
      adminApi('/admin/content/branch-triggers'),
    ]);

    if (!coursesResponse.ok || !videosResponse.ok || !triggersResponse.ok) {
      setError('Content data could not be loaded.');
      return;
    }

    setCourses(await coursesResponse.json());
    const availableVideos = ((await videosResponse.json()) as Video[]).filter(
      (video) => video.published,
    );
    setVideos(availableVideos);
    const availableTriggers = (await triggersResponse.json()) as BranchTrigger[];
    setBranchTriggers(availableTriggers);
    setRelationTriggerId((current) => current || availableTriggers[0]?.id || '');
  };

  useEffect(() => {
    void load();
  }, []);

  const request = async (
    path: AdminApiPath,
    method: 'POST' | 'PATCH' | 'DELETE',
    body?: unknown,
  ) => {
    setError('');
    const response = await adminApi(path, {
      method,
      ...(body === undefined
        ? {}
        : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
    });
    if (!response.ok) {
      const details = await response.text();
      setError(`Operation failed (HTTP ${response.status})${details ? `: ${details}` : '.'}`);
      return false;
    }
    await load();
    return true;
  };

  const post = (path: AdminApiPath, body: unknown) => request(path, 'POST', body);

  const saveTitle = async () => {
    if (!editingTitle?.title.trim()) return;
    const paths: Record<EditingTitle['kind'], AdminApiPath> = {
      course: `/admin/content/courses/${editingTitle.id}`,
      module: `/admin/content/modules/${editingTitle.id}`,
      lesson: `/admin/content/lessons/${editingTitle.id}`,
    };
    if (await request(paths[editingTitle.kind], 'PATCH', { title: editingTitle.title.trim() })) {
      setEditingTitle(undefined);
    }
  };

  const remove = async (kind: 'course' | 'module' | 'lesson', id: string, label: string) => {
    const consequences = {
      course: 'This also deletes every module, lesson, and lesson path in the course.',
      module: 'This also deletes every lesson and lesson path in the module.',
      lesson: 'Its video is kept and becomes available for another lesson.',
    };
    if (!window.confirm(t(`Delete ${t(kind)} "${label}"? ${t(consequences[kind])}`))) return;
    const paths: Record<typeof kind, AdminApiPath> = {
      course: `/admin/content/courses/${id}`,
      module: `/admin/content/modules/${id}`,
      lesson: `/admin/content/lessons/${id}`,
    };
    if ((await request(paths[kind], 'DELETE')) && selected === id) setSelected('');
  };

  const move = async (path: AdminApiPath, ids: string[], index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    const reordered = [...ids];
    [reordered[index], reordered[target]] = [reordered[target]!, reordered[index]!];
    await post(
      path,
      path.includes('/modules/reorder') ? { moduleIds: reordered } : { lessonIds: reordered },
    );
  };

  const updateLessonDraft = (moduleId: string, patch: Partial<LessonDraft>) => {
    setLessonDrafts((current) => ({
      ...current,
      [moduleId]: { title: '', videoId: '', ...current[moduleId], ...patch },
    }));
  };

  const publishCourse = async (id: string) => {
    const validation = await validateCourse(id);
    if (!validation?.valid) return;
    const response = await adminApi(`/admin/content/courses/${id}/publish`, { method: 'POST' });
    if (response.ok) await load();
    else setError(`Course publishing failed (HTTP ${response.status}).`);
  };

  const validateCourse = async (id: string) => {
    setError('');
    const response = await adminApi(`/admin/content/courses/${id}/validation`);
    if (!response.ok) {
      setError(`Course validation failed (HTTP ${response.status}).`);
      return undefined;
    }
    const report = (await response.json()) as CourseValidation;
    setValidationReports((current) => ({ ...current, [id]: report }));
    return report;
  };

  const createCourse = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const courseKey = slug(title) || `course-${Date.now()}`;
    setError('');
    const response = await adminApi('/admin/content/courses', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        key: courseKey,
        title: title.trim(),
        discipline: 'NO_GI_GRAPPLING',
      }),
    });
    if (!response.ok) {
      const details = await response.text();
      setError(`Course creation failed (HTTP ${response.status})${details ? `: ${details}` : '.'}`);
      return;
    }
    const course = (await response.json()) as Course;
    setTitle('');
    setSelected(course.id);
    await load();
  };

  return (
    <main style={{ maxWidth: 960, margin: '40px auto', padding: 24 }}>
      <nav>
        <a href="/">{t('Courses')} </a> - <a href="/videos">{t('Upload video')} </a> -{' '}
        <a href="/assessment">{t('Assessment')} </a> -{' '}
        <a href="/foundation">{t('Foundation Roadmap')} </a>
      </nav>
      <h1>{t('MATIQ Content Builder')} </h1>

      <form onSubmit={createCourse}>
        <input
          required
          placeholder={t('Course title')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button>{t('Create course')} </button>
      </form>

      {error && <p role="alert">{t(error)}</p>}

      {courses.map((course) => (
        <article key={course.id} style={{ border: '1px solid #ddd', padding: 16, marginTop: 16 }}>
          <h2>{course.title}</h2>
          <small>
            {course.key} - {course.published ? t('published') : t('draft')}
          </small>{' '}
          <button
            type="button"
            onClick={() => setSelected((current) => (current === course.id ? '' : course.id))}
          >
            {selected === course.id ? t('Close course editor') : t('Open course editor')}
          </button>{' '}
          <button type="button" onClick={() => void publishCourse(course.id)}>
            {course.published ? t('Publish updates') : t('Publish course')}
          </button>{' '}
          <button type="button" onClick={() => void validateCourse(course.id)}>
            {t('Validate course')}{' '}
          </button>{' '}
          <button
            type="button"
            onClick={() => setEditingTitle({ kind: 'course', id: course.id, title: course.title })}
          >
            {t('Edit course')}{' '}
          </button>{' '}
          <button type="button" onClick={() => void remove('course', course.id, course.title)}>
            {t('Delete course')}{' '}
          </button>
          {validationReports[course.id] && (
            <ValidationReport title={course.title} report={validationReports[course.id]!} />
          )}
          {editingTitle?.kind === 'course' && editingTitle.id === course.id && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void saveTitle();
              }}
            >
              <input
                aria-label={t('Course title to edit')}
                value={editingTitle.title}
                onChange={(event) =>
                  setEditingTitle((current) =>
                    current ? { ...current, title: event.target.value } : current,
                  )
                }
              />
              <button disabled={!editingTitle.title.trim()}>{t('Save course')} </button>
              <button type="button" onClick={() => setEditingTitle(undefined)}>
                {t('Cancel')}{' '}
              </button>
            </form>
          )}
          {selected === course.id && (
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                if (
                  await post(`/admin/content/courses/${course.id}/modules`, {
                    key: slug(moduleTitle) || `module-${Date.now()}`,
                    title: moduleTitle.trim(),
                    position: course.modules.length,
                  })
                )
                  setModuleTitle('');
              }}
            >
              <input
                required
                placeholder={t('New module')}
                value={moduleTitle}
                onChange={(event) => setModuleTitle(event.target.value)}
              />
              <button>{t('Add module')} </button>
            </form>
          )}
          {course.modules.map((module, moduleIndex) => (
            <section key={module.id}>
              <h3>
                {module.position + 1}. {module.title}
              </h3>
              <button
                type="button"
                disabled={moduleIndex === 0}
                onClick={() =>
                  void move(
                    `/admin/content/courses/${course.id}/modules/reorder`,
                    course.modules.map((item) => item.id),
                    moduleIndex,
                    -1,
                  )
                }
              >
                {t('Move module up')}{' '}
              </button>{' '}
              <button
                type="button"
                disabled={moduleIndex === course.modules.length - 1}
                onClick={() =>
                  void move(
                    `/admin/content/courses/${course.id}/modules/reorder`,
                    course.modules.map((item) => item.id),
                    moduleIndex,
                    1,
                  )
                }
              >
                {t('Move module down')}{' '}
              </button>{' '}
              <button
                type="button"
                onClick={() =>
                  setEditingTitle({ kind: 'module', id: module.id, title: module.title })
                }
              >
                {t('Edit module')}{' '}
              </button>{' '}
              <button type="button" onClick={() => void remove('module', module.id, module.title)}>
                {t('Delete module')}{' '}
              </button>
              {editingTitle?.kind === 'module' && editingTitle.id === module.id && (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveTitle();
                  }}
                >
                  <input
                    aria-label={t('Module title to edit')}
                    value={editingTitle.title}
                    onChange={(event) =>
                      setEditingTitle((current) =>
                        current ? { ...current, title: event.target.value } : current,
                      )
                    }
                  />
                  <button disabled={!editingTitle.title.trim()}>{t('Save module')} </button>
                  <button type="button" onClick={() => setEditingTitle(undefined)}>
                    {t('Cancel')}{' '}
                  </button>
                </form>
              )}
              <ul>
                {module.lessons.map((lesson, lessonIndex) => (
                  <li key={lesson.id}>
                    {lesson.position + 1}. {lesson.title}
                    {lesson.video ? ` - ${lesson.video.title}` : ''}{' '}
                    {lesson.published ? t('published') : t('(draft)')}{' '}
                    {!lesson.published && (
                      <button
                        type="button"
                        onClick={() =>
                          void request(`/admin/content/lessons/${lesson.id}/publish`, 'POST')
                        }
                      >
                        {t('Publish lesson')}{' '}
                      </button>
                    )}{' '}
                    <button
                      type="button"
                      disabled={lessonIndex === 0}
                      onClick={() =>
                        void move(
                          `/admin/content/modules/${module.id}/lessons/reorder`,
                          module.lessons.map((item) => item.id),
                          lessonIndex,
                          -1,
                        )
                      }
                    >
                      {t('Move lesson up')}{' '}
                    </button>{' '}
                    <button
                      type="button"
                      disabled={lessonIndex === module.lessons.length - 1}
                      onClick={() =>
                        void move(
                          `/admin/content/modules/${module.id}/lessons/reorder`,
                          module.lessons.map((item) => item.id),
                          lessonIndex,
                          1,
                        )
                      }
                    >
                      {t('Move lesson down')}{' '}
                    </button>{' '}
                    <button
                      type="button"
                      onClick={() =>
                        setEditingTitle({ kind: 'lesson', id: lesson.id, title: lesson.title })
                      }
                    >
                      {t('Edit lesson')}{' '}
                    </button>{' '}
                    <button
                      type="button"
                      onClick={() => void remove('lesson', lesson.id, lesson.title)}
                    >
                      {t('Delete lesson')}{' '}
                    </button>{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setRelationFrom(relationFrom === lesson.id ? '' : lesson.id);
                        setEditingRelationId('');
                        setRelationTarget('');
                        setRelationType('PRIMARY');
                        setRelationTriggerId(branchTriggers[0]?.id ?? '');
                      }}
                    >
                      {t('Add lesson path')}{' '}
                    </button>
                    {lesson.outgoingRelations?.length ? (
                      <small>
                        {' '}
                        ({lesson.outgoingRelations.length} {t('lesson paths)')}{' '}
                      </small>
                    ) : null}
                    {lesson.outgoingRelations?.map((relation) => (
                      <div key={relation.id} style={{ marginTop: 8, paddingLeft: 12 }}>
                        <strong>
                          {relation.type === 'PRIMARY' ? t('Primary path') : t('Conditional path')}
                        </strong>
                        {' → '}
                        {relation.toLesson.title}
                        {relation.trigger ? ` — ${relation.trigger.name}` : ''}{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setRelationFrom(lesson.id);
                            setEditingRelationId(relation.id);
                            setRelationTarget(relation.toLessonId);
                            setRelationType(relation.type);
                            setRelationTriggerId(
                              relation.trigger?.id ?? branchTriggers[0]?.id ?? '',
                            );
                          }}
                        >
                          {t('Edit path')}{' '}
                        </button>{' '}
                        <button
                          type="button"
                          onClick={async () => {
                            if (!window.confirm(t(`Delete path to "${relation.toLesson.title}"?`)))
                              return;
                            await request(
                              `/admin/content/lesson-relations/${relation.id}`,
                              'DELETE',
                            );
                          }}
                        >
                          {t('Delete path')}{' '}
                        </button>
                      </div>
                    ))}
                    {editingTitle?.kind === 'lesson' && editingTitle.id === lesson.id && (
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          void saveTitle();
                        }}
                      >
                        <input
                          aria-label={t('Lesson title to edit')}
                          value={editingTitle.title}
                          onChange={(event) =>
                            setEditingTitle((current) =>
                              current ? { ...current, title: event.target.value } : current,
                            )
                          }
                        />
                        <button disabled={!editingTitle.title.trim()}>{t('Save lesson')} </button>
                        <button type="button" onClick={() => setEditingTitle(undefined)}>
                          {t('Cancel')}{' '}
                        </button>
                      </form>
                    )}
                    {relationFrom === lesson.id && (
                      <form
                        onSubmit={async (event) => {
                          event.preventDefault();
                          if (!relationTarget) {
                            setError('Select a target lesson.');
                            return;
                          }
                          const body = {
                            toLessonId: relationTarget,
                            type: relationType,
                            triggerId: relationType === 'BRANCH' ? relationTriggerId : undefined,
                            position: lesson.outgoingRelations?.length ?? 0,
                          };
                          const saved = editingRelationId
                            ? await request(
                                `/admin/content/lesson-relations/${editingRelationId}`,
                                'PATCH',
                                body,
                              )
                            : await post(`/admin/content/lessons/${lesson.id}/relations`, body);
                          if (saved) {
                            setRelationFrom('');
                            setEditingRelationId('');
                            setRelationTarget('');
                          }
                        }}
                      >
                        <fieldset style={{ marginTop: 12 }}>
                          <legend>
                            {editingRelationId ? t('Edit') : t('Create')} {t('a path from "')}{' '}
                            {lesson.title}
                            &quot;
                          </legend>
                          <label>
                            {t('1. Target lesson — where should the athlete continue?')}{' '}
                            <select
                              required
                              aria-label={t('Target lesson')}
                              value={relationTarget}
                              onChange={(event) => setRelationTarget(event.target.value)}
                            >
                              <option value="">{t('Select target lesson')} </option>
                              {course.modules.flatMap((courseModule) =>
                                courseModule.lessons
                                  .filter((target) => target.id !== lesson.id)
                                  .map((target) => (
                                    <option key={target.id} value={target.id}>
                                      {courseModule.title} - {target.title}
                                    </option>
                                  )),
                              )}
                            </select>
                          </label>
                          <label>
                            {t('2. Path type')}{' '}
                            <select
                              aria-label={t('Path type')}
                              value={relationType}
                              onChange={(event) =>
                                setRelationType(event.target.value as 'PRIMARY' | 'BRANCH')
                              }
                            >
                              <option value="PRIMARY">
                                {t('Primary path — normal continuation')}{' '}
                              </option>
                              <option value="BRANCH">
                                {t('Conditional path — situation dependent')}{' '}
                              </option>
                            </select>
                          </label>
                          <p>
                            {t(
                              'Paths are optional because every lesson can be opened independently. Use at most one primary path when you want to suggest a normal next lesson. Use conditional paths when the suggestion depends on an opponent reaction or another situation.',
                            )}{' '}
                          </p>
                          {relationType === 'BRANCH' && (
                            <>
                              <label>
                                {t('3. Branch trigger — when should this path be shown?')}{' '}
                                <select
                                  required
                                  aria-label={t('Branch trigger')}
                                  value={relationTriggerId}
                                  onChange={(event) => setRelationTriggerId(event.target.value)}
                                >
                                  {branchTriggers.map((trigger) => (
                                    <option key={trigger.id} value={trigger.id}>
                                      {trigger.name}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <input
                                aria-label={t('New branch trigger')}
                                placeholder={t('New trigger, for example Opponent sprawls')}
                                value={newTriggerName}
                                onChange={(event) => setNewTriggerName(event.target.value)}
                              />
                              <button
                                type="button"
                                disabled={!newTriggerName.trim()}
                                onClick={async () => {
                                  const response = await adminApi(
                                    '/admin/content/branch-triggers',
                                    {
                                      method: 'POST',
                                      headers: { 'content-type': 'application/json' },
                                      body: JSON.stringify({
                                        key: slug(newTriggerName) || `trigger-${Date.now()}`,
                                        name: newTriggerName.trim(),
                                      }),
                                    },
                                  );
                                  if (!response.ok) {
                                    setError(`Trigger creation failed (HTTP ${response.status}).`);
                                    return;
                                  }
                                  const trigger = (await response.json()) as BranchTrigger;
                                  setNewTriggerName('');
                                  await load();
                                  setRelationTriggerId(trigger.id);
                                }}
                              >
                                {t('Add new trigger')}{' '}
                              </button>
                            </>
                          )}
                          <button>
                            {editingRelationId ? t('Save lesson path') : t('Create lesson path')}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRelationFrom('');
                              setEditingRelationId('');
                            }}
                          >
                            {t('Cancel')}{' '}
                          </button>
                        </fieldset>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
              {selected === course.id && (
                <form
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const draft = lessonDrafts[module.id] ?? { title: '', videoId: '' };
                    if (!draft.videoId) {
                      setError('Select an unused published video for this lesson.');
                      return;
                    }
                    setSubmittingModuleId(module.id);
                    try {
                      if (
                        await post(`/admin/content/modules/${module.id}/lessons`, {
                          key: slug(draft.title) || `lesson-${Date.now()}`,
                          title: draft.title.trim(),
                          videoId: draft.videoId,
                          position: module.lessons.length,
                          reactions: [],
                          published: false,
                        })
                      ) {
                        setLessonDrafts((current) => ({
                          ...current,
                          [module.id]: { title: '', videoId: '' },
                        }));
                      }
                    } finally {
                      setSubmittingModuleId('');
                    }
                  }}
                >
                  <input
                    required
                    placeholder={t('Lesson title')}
                    value={lessonDrafts[module.id]?.title ?? ''}
                    onChange={(event) =>
                      updateLessonDraft(module.id, { title: event.target.value })
                    }
                  />
                  <select
                    required
                    aria-label={t('Published video')}
                    value={lessonDrafts[module.id]?.videoId ?? ''}
                    onChange={(event) =>
                      updateLessonDraft(module.id, { videoId: event.target.value })
                    }
                  >
                    <option value="">{t('Select an unused published video')} </option>
                    {videos
                      .filter(
                        (video) =>
                          !courses.some((existingCourse) =>
                            existingCourse.modules.some((existingModule) =>
                              existingModule.lessons.some(
                                (existingLesson) => existingLesson.video?.id === video.id,
                              ),
                            ),
                          ),
                      )
                      .map((video) => (
                        <option key={video.id} value={video.id}>
                          {video.title} - {video.id}
                        </option>
                      ))}
                  </select>
                  <button disabled={submittingModuleId === module.id}>
                    {submittingModuleId === module.id ? t('Adding lesson...') : t('Add lesson')}
                  </button>
                  {videos.length > 0 &&
                    videos.every((video) =>
                      courses.some((existingCourse) =>
                        existingCourse.modules.some((existingModule) =>
                          existingModule.lessons.some(
                            (existingLesson) => existingLesson.video?.id === video.id,
                          ),
                        ),
                      ),
                    ) && (
                      <small>
                        {t(
                          'All published videos are already assigned. Upload and publish another video before adding a lesson.',
                        )}{' '}
                      </small>
                    )}
                </form>
              )}
            </section>
          ))}
        </article>
      ))}
    </main>
  );
}
