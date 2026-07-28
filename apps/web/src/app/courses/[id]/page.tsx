import CourseDetailPage from '../../../screens/courses/CourseDetailPage';

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CourseDetailPage id={id} />;
}
