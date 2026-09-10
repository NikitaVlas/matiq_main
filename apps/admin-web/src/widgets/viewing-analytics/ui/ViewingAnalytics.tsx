'use client';
import { t, useAdminLanguage, adminLocale } from '../../../shared/i18n';
export type ViewingAnalyticsData = {
  totals: { paidMs: number; trialMs: number };
  trainers: {
    trainerId: string | null;
    displayName: string;
    paidMs: number;
    trialMs: number;
    videos: {
      videoId: string;
      title: string;
      course: { id: string; title: string } | null;
      paidMs: number;
      trialMs: number;
    }[];
  }[];
};

const seconds = (milliseconds: number) =>
  Math.floor(milliseconds / 1000).toLocaleString(adminLocale());

export function ViewingAnalytics({ data }: { data: ViewingAnalyticsData }) {
  useAdminLanguage();
  return (
    <section style={{ marginTop: 40 }} aria-labelledby="viewing-analytics-title">
      <h2 id="viewing-analytics-title">{t('Bestätigte Wiedergabezeit')} </h2>
      <p>
        {t('Bezahlt:')} {seconds(data.totals.paidMs)} {t('Sek. · Trial:')}{' '}
        {seconds(data.totals.trialMs)} {t('Sek.')}{' '}
      </p>
      {data.trainers.length === 0 ? (
        <p>{t('Noch keine bestätigten Wiedergabeintervalle.')} </p>
      ) : (
        data.trainers.map((trainer) => (
          <article className="shell" key={trainer.trainerId ?? 'unassigned'}>
            <h3>{trainer.displayName}</h3>
            <p>
              {t('Paid')} {seconds(trainer.paidMs)} {t('Sek. · Trial')} {seconds(trainer.trialMs)}{' '}
              {t('Sek.')}{' '}
            </p>
            <table>
              <thead>
                <tr>
                  <th>{t('Video')} </th>
                  <th>{t('Kurs')} </th>
                  <th>{t('Paid')} </th>
                  <th>{t('Trial')} </th>
                </tr>
              </thead>
              <tbody>
                {trainer.videos.map((video) => (
                  <tr key={video.videoId}>
                    <td>{video.title}</td>
                    <td>{video.course?.title ?? t('Standalone')}</td>
                    <td>
                      {seconds(video.paidMs)} {t('Sek.')}{' '}
                    </td>
                    <td>
                      {seconds(video.trialMs)} {t('Sek.')}{' '}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        ))
      )}
    </section>
  );
}
