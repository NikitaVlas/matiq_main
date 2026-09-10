import Link from 'next/link';
import { type CatalogVideo, disciplineLabel } from './catalog';
export function VideoCard({ video, index }: { video: CatalogVideo; index: number }) {
  return (
    <article className="catalog-video-card">
      <div className="catalog-video-mark" aria-hidden="true">
        <span>{String(index + 1).padStart(2, '0')}</span>
        <span>MATIQ / VIDEO</span>
      </div>
      <p className="catalog-meta">
        {video.disciplines.map(disciplineLabel).join(' · ') || 'Grappling'}
        {video.durationSec ? ` · ${Math.ceil(video.durationSec / 60)} Min.` : ''}
      </p>
      <h3>
        <Link href={`/video/${video.id}`}>{video.title}</Link>
      </h3>
      {video.description && <p className="catalog-description">{video.description}</p>}
      {video.trainer && (
        <Link className="catalog-author" href={`/trainers/${video.trainer.slug}`}>
          {video.trainer.displayName}
        </Link>
      )}
      <Link className="catalog-open" href={`/video/${video.id}`}>
        Video ansehen <span aria-hidden="true">↗</span>
      </Link>
      <small>Wiedergabe mit Testphase oder Mitgliedschaft</small>
    </article>
  );
}
