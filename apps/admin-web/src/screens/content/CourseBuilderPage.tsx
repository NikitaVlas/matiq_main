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

  const post = async (path: string, body: unknown) => {
    setError('');
    const response = await adminApi(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const details = await response.text();
      setError(`Operation failed (HTTP ${response.status})${details ? `: ${details}` : '.'}`);
      return false;
    }
    await load();
    return true;
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
          </button>
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
          {course.modules.map((module) => (
            <section key={module.id}>
              <h3>
                {module.position + 1}. {module.title}
              </h3>
              <ul>
                {module.lessons.map((lesson) => (
                  <li key={lesson.id}>
                    {lesson.position + 1}. {lesson.title}
                    {lesson.video ? ` - ${lesson.video.title}` : ''}{' '}
                    {lesson.published ? 'published' : '(draft)'}{' '}
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
                    onChange={(event) => updateLessonDraft(module.id, { title: event.target.value })}
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
