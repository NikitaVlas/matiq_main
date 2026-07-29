export type TopicReference = { name: string } | null | undefined;

export type LessonVideo = {
  title: string;
  description?: string | null;
  durationSec?: number | null;
  position?: TopicReference;
  technique?: TopicReference;
  variant?: TopicReference;
  movement?: TopicReference;
  drill?: TopicReference;
};

export function formatDuration(durationSec?: number | null) {
  if (!durationSec || durationSec < 1) return 'Nicht angegeben';
  const minutes = Math.floor(durationSec / 60);
  const seconds = Math.floor(durationSec % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')} Min.`;
}

export function progressPercent(watchedSeconds: number, durationSec?: number | null) {
  if (!durationSec || durationSec < 1) return 0;
  return Math.min(100, Math.max(0, Math.round((watchedSeconds / durationSec) * 100)));
}

export function getVideoTopics(video: LessonVideo) {
  return [
    { label: 'Position', value: video.position?.name },
    { label: 'Technik', value: video.technique?.name },
    { label: 'Variante', value: video.variant?.name },
    { label: 'Bewegung', value: video.movement?.name },
    { label: 'Drill', value: video.drill?.name },
  ].filter((topic): topic is { label: string; value: string } => Boolean(topic.value));
}
