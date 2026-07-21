import VideoDetail from '../../features/video/VideoDetail';

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VideoDetail id={id} />;
}
