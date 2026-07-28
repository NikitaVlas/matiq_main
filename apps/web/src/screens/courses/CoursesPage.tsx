'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type Course = {
  id: string;
  title: string;
  description?: string;
  modules: { lessons: { id: string }[] }[];
};

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${api}/content/courses`)
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then(setCourses)
      .catch(() => setError('Courses could not be loaded.'));
  }, []);

  return (
    <main>
      <p className="eyebrow">Learning paths</p>
      <h1>COURSES</h1>
      {error && <p className="error">{error}</p>}
      <div className="course-grid">
        {courses.map((course) => {
          const lessonCount = course.modules.reduce(
            (total, courseModule) => total + courseModule.lessons.length,
            0,
          );
          return (
            <article className="shell course-card" key={course.id}>
              <p className="eyebrow">
                {course.modules.length} modules - {lessonCount} lessons
              </p>
              <h2>{course.title}</h2>
              {course.description && <p>{course.description}</p>}
              <Link className="action-link" href={`/courses/${course.id}`}>
                Open course
              </Link>
            </article>
          );
        })}
      </div>
    </main>
  );
}
