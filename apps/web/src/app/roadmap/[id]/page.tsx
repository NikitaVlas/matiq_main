import RoadmapDetail from '../../../features/roadmap/RoadmapDetail';

export default async function RoadmapItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RoadmapDetail id={id} />;
}
