'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type Course = {
  id: string;
  title: string;
  description?: string;
  modules: {
    id: string;
    title: string;
    lessons: {
      id: string;
      title: string;
      goal?: string;
      videoId: string;
      outgoingRelations: {
        type: 'PRIMARY' | 'BRANCH';
        trigger?: { name: string };
        toLesson: { id: string; title: string };
      }[];
    }[];
  }[];
};

export default function CourseDetailPage({ id }: { id: string }) {
  const [course, setCourse] = useState<Course>();
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${api}/content/courses`)
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const courses = (await response.json()) as Course[];
        const selectedCourse = courses.find((item) => item.id === id);
        if (!selectedCourse) throw new Error();
        setCourse(selectedCourse);
      })
      .catch(() => setError('Course could not be loaded.'));
  }, [id]);

  if (error) {
    return (
      <main>
        <p className="error">{error}</p>
        <Link href="/courses">Back to courses</Link>
      </main>
    );
  }

  if (!course) {
    return (
      <main>
        <p>Course is loading...</p>
      </main>
    );
  }

  return (
    <main>
      <Link href="/courses">Back to courses</Link>
      <p className="eyebrow">Course</p>
      <h1>{course.title}</h1>
      {course.description && <p>{course.description}</p>}

      {course.modules.map((courseModule, moduleIndex) => (
        <section className="shell course-module" key={courseModule.id}>
          <p className="eyebrow">Module {moduleIndex + 1}</p>
          <h2>{courseModule.title}</h2>
          {courseModule.lessons.length === 0 && <p>No lessons published yet.</p>}
          <ol className="lesson-list">
            {courseModule.lessons.map((lesson) => (
              <li key={lesson.id}>
                <div>
                  <strong>{lesson.title}</strong>
                  {lesson.goal && <p>{lesson.goal}</p>}
                  {lesson.outgoingRelations.length > 0 && (
                    <small>
                      Next options:{' '}
                      {lesson.outgoingRelations
                        .map((relation) =>
                          relation.type === 'PRIMARY'
                            ? `Main continuation: ${relation.toLesson.title}`
                            : `${relation.trigger?.name ?? 'Conditional branch'}: ${relation.toLesson.title}`,
                        )
                        .join(', ')}
                    </small>
                  )}
                </div>
                <Link className="action-link" href={`/video/${lesson.videoId}`}>
                  Watch video
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </main>
  );
}
