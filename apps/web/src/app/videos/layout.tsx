import { VideoAccessGate } from '../../features/auth/SessionVisibility';

export default function VideosLayout({ children }: { children: React.ReactNode }) {
  return <VideoAccessGate>{children}</VideoAccessGate>;
}
