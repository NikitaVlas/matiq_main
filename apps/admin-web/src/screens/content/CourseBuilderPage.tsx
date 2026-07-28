'use client';

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

const slug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export default function CourseBuilderPage() {
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
  const [relationTarget, setRelationTarget] = useState('');
  const [relationType, setRelationType] = useState<'PRIMARY' | 'BRANCH'>('PRIMARY');
  const [relationTriggerId, setRelationTriggerId] = useState('');
  const [newTriggerName, setNewTriggerName] = useState('');
  const [error, setError] = useState('');

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

  const request = async (path: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown) => {
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

  const post = (path: string, body: unknown) => request(path, 'POST', body);

  const saveTitle = async () => {
    if (!editingTitle?.title.trim()) return;
    const paths = {
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
    if (!window.confirm(`Delete ${kind} "${label}"? ${consequences[kind]}`)) return;
    const paths = {
      course: `/admin/content/courses/${id}`,
      module: `/admin/content/modules/${id}`,
      lesson: `/admin/content/lessons/${id}`,
    };
    if ((await request(paths[kind], 'DELETE')) && selected === id) setSelected('');
  };

  const move = async (path: string, ids: string[], index: number, direction: -1 | 1) => {
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
    const response = await adminApi(`/admin/content/courses/${id}/publish`, { method: 'POST' });
    if (response.ok) await load();
    else setError(`Course publishing failed (HTTP ${response.status}).`);
  };

  const createCourse = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const courseKey = slug(title) || `course-${Date.now()}`;
    if (
      await post('/admin/content/courses', {
        key: courseKey,
        title,
        discipline: 'NO_GI_GRAPPLING',
      })
    ) {
      setTitle('');
    }
  };

  return (
    <main style={{ maxWidth: 960, margin: '40px auto', padding: 24 }}>
      <nav>
        <a href="/">Courses</a> - <a href="/videos">Upload video</a>
      </nav>
      <h1>MATIQ Content Builder</h1>

      <form onSubmit={createCourse}>
        <input
          required
          placeholder="Course title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button>Create course</button>
      </form>

      {error && <p role="alert">{error}</p>}

      {courses.map((course) => (
        <article key={course.id} style={{ border: '1px solid #ddd', padding: 16, marginTop: 16 }}>
          <h2>
            <button type="button" onClick={() => setSelected(course.id)}>
              {course.title}
            </button>
          </h2>
          <small>
            {course.key} - {course.published ? 'published' : 'draft'}
          </small>{' '}
          <button type="button" onClick={() => void publishCourse(course.id)}>
            {course.published ? 'Publish updates' : 'Publish course'}
          </button>{' '}
          <button
            type="button"
            onClick={() => setEditingTitle({ kind: 'course', id: course.id, title: course.title })}
          >
            Edit course
          </button>{' '}
          <button type="button" onClick={() => void remove('course', course.id, course.title)}>
            Delete course
          </button>
          {editingTitle?.kind === 'course' && editingTitle.id === course.id && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void saveTitle();
              }}
            >
              <input
                aria-label="Course title to edit"
                value={editingTitle.title}
                onChange={(event) =>
                  setEditingTitle((current) =>
                    current ? { ...current, title: event.target.value } : current,
                  )
                }
              />
              <button disabled={!editingTitle.title.trim()}>Save course</button>
              <button type="button" onClick={() => setEditingTitle(undefined)}>
                Cancel
              </button>
            </form>
          )}
          {selected === course.id && (
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                if (
                  await post(`/admin/content/courses/${course.id}/modules`, {
                    key: slug(moduleTitle),
                    title: moduleTitle,
                    position: course.modules.length,
                  })
                )
                  setModuleTitle('');
              }}
            >
              <input
                required
                placeholder="New module"
                value={moduleTitle}
                onChange={(event) => setModuleTitle(event.target.value)}
              />
              <button>Add module</button>
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
                Move module up
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
                Move module down
              </button>{' '}
              <button
                type="button"
                onClick={() =>
                  setEditingTitle({ kind: 'module', id: module.id, title: module.title })
                }
              >
                Edit module
              </button>{' '}
              <button type="button" onClick={() => void remove('module', module.id, module.title)}>
                Delete module
              </button>
              {editingTitle?.kind === 'module' && editingTitle.id === module.id && (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveTitle();
                  }}
                >
                  <input
                    aria-label="Module title to edit"
                    value={editingTitle.title}
                    onChange={(event) =>
                      setEditingTitle((current) =>
                        current ? { ...current, title: event.target.value } : current,
                      )
                    }
                  />
                  <button disabled={!editingTitle.title.trim()}>Save module</button>
                  <button type="button" onClick={() => setEditingTitle(undefined)}>
                    Cancel
                  </button>
                </form>
              )}
              <ul>
                {module.lessons.map((lesson, lessonIndex) => (
                  <li key={lesson.id}>
                    {lesson.position + 1}. {lesson.title}
                    {lesson.video ? ` - ${lesson.video.title}` : ''}{' '}
                    {lesson.published ? 'published' : '(draft)'}{' '}
                    {!lesson.published && (
                      <button
                        type="button"
                        onClick={() =>
                          void request(`/admin/content/lessons/${lesson.id}/publish`, 'POST')
                        }
                      >
                        Publish lesson
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
                      Move lesson up
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
                      Move lesson down
                    </button>{' '}
                    <button
                      type="button"
                      onClick={() =>
                        setEditingTitle({ kind: 'lesson', id: lesson.id, title: lesson.title })
                      }
                    >
                      Edit lesson
                    </button>{' '}
                    <button
                      type="button"
                      onClick={() => void remove('lesson', lesson.id, lesson.title)}
                    >
                      Delete lesson
                    </button>{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setRelationFrom(relationFrom === lesson.id ? '' : lesson.id);
                        setRelationTarget('');
                      }}
                    >
                      Add branch
                    </button>
                    {lesson.outgoingRelations?.length ? (
                      <small> ({lesson.outgoingRelations.length} branches)</small>
                    ) : null}
                    {editingTitle?.kind === 'lesson' && editingTitle.id === lesson.id && (
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          void saveTitle();
                        }}
                      >
                        <input
                          aria-label="Lesson title to edit"
                          value={editingTitle.title}
                          onChange={(event) =>
                            setEditingTitle((current) =>
                              current ? { ...current, title: event.target.value } : current,
                            )
                          }
                        />
                        <button disabled={!editingTitle.title.trim()}>Save lesson</button>
                        <button type="button" onClick={() => setEditingTitle(undefined)}>
                          Cancel
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
                          if (
                            await post(`/admin/content/lessons/${lesson.id}/relations`, {
                              toLessonId: relationTarget,
                              type: relationType,
                              triggerId: relationType === 'BRANCH' ? relationTriggerId : undefined,
                              position: lesson.outgoingRelations?.length ?? 0,
                            })
                          ) {
                            setRelationFrom('');
                            setRelationTarget('');
                          }
                        }}
                      >
                        <select
                          required
                          aria-label="Target lesson"
                          value={relationTarget}
                          onChange={(event) => setRelationTarget(event.target.value)}
                        >
                          <option value="">Select target lesson</option>
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
                        <select
                          aria-label="Branch type"
                          value={relationType}
                          onChange={(event) =>
                            setRelationType(event.target.value as 'PRIMARY' | 'BRANCH')
                          }
                        >
                          <option value="PRIMARY">Main continuation</option>
                          <option value="BRANCH">Conditional branch</option>
                        </select>
                        <small>
                          Main continuation is the normal next lesson. Conditional branch is an
                          optional path caused by a reaction or situation.
                        </small>
                        {relationType === 'BRANCH' && (
                          <>
                            <select
                              required
                              aria-label="Branch trigger"
                              value={relationTriggerId}
                              onChange={(event) => setRelationTriggerId(event.target.value)}
                            >
                              {branchTriggers.map((trigger) => (
                                <option key={trigger.id} value={trigger.id}>
                                  {trigger.name}
                                </option>
                              ))}
                            </select>
                            <input
                              placeholder="New branch trigger"
                              value={newTriggerName}
                              onChange={(event) => setNewTriggerName(event.target.value)}
                            />
                            <button
                              type="button"
                              disabled={!newTriggerName.trim()}
                              onClick={async () => {
                                const response = await adminApi('/admin/content/branch-triggers', {
                                  method: 'POST',
                                  headers: { 'content-type': 'application/json' },
                                  body: JSON.stringify({
                                    key: slug(newTriggerName) || `trigger-${Date.now()}`,
                                    name: newTriggerName.trim(),
                                  }),
                                });
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
                              Add new trigger
                            </button>
                          </>
                        )}
                        <button>Create branch</button>
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
                    placeholder="Lesson title"
                    value={lessonDrafts[module.id]?.title ?? ''}
                    onChange={(event) =>
                      updateLessonDraft(module.id, { title: event.target.value })
                    }
                  />
                  <select
                    required
                    aria-label="Published video"
                    value={lessonDrafts[module.id]?.videoId ?? ''}
                    onChange={(event) =>
                      updateLessonDraft(module.id, { videoId: event.target.value })
                    }
                  >
                    <option value="">Select an unused published video</option>
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
                    {submittingModuleId === module.id ? 'Adding lesson...' : 'Add lesson'}
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
                        All published videos are already assigned. Upload and publish another video
                        before adding a lesson.
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
