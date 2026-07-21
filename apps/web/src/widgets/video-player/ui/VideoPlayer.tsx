'use client';

export function VideoPlayer({
  src,
  onProgress,
}: {
  src: string;
  onProgress?: (seconds: number) => void;
}) {
  return (
    <video
      controls
      controlsList="nodownload"
      src={src}
      onTimeUpdate={(event) => onProgress?.(Math.floor(event.currentTarget.currentTime))}
      style={{ width: '100%', background: '#111' }}
    />
  );
}
