import TrainerDetailPage from '../../../screens/trainers/TrainerDetailPage';

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <TrainerDetailPage slug={slug} />;
}
