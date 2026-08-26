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

const seconds = (milliseconds: number) => Math.floor(milliseconds / 1000).toLocaleString('de-DE');

export function ViewingAnalytics({ data }: { data: ViewingAnalyticsData }) {
  return (
    <section style={{ marginTop: 40 }} aria-labelledby="viewing-analytics-title">
      <h2 id="viewing-analytics-title">Bestätigte Wiedergabezeit</h2>
      <p>
        Bezahlt: {seconds(data.totals.paidMs)} Sek. · Trial: {seconds(data.totals.trialMs)} Sek.
      </p>
      {data.trainers.length === 0 ? (
        <p>Noch keine bestätigten Wiedergabeintervalle.</p>
      ) : (
        data.trainers.map((trainer) => (
          <article className="shell" key={trainer.trainerId ?? 'unassigned'}>
            <h3>{trainer.displayName}</h3>
            <p>
              Paid {seconds(trainer.paidMs)} Sek. · Trial {seconds(trainer.trialMs)} Sek.
            </p>
            <table>
              <thead>
                <tr>
                  <th>Video</th>
                  <th>Kurs</th>
                  <th>Paid</th>
                  <th>Trial</th>
                </tr>
              </thead>
              <tbody>
                {trainer.videos.map((video) => (
                  <tr key={video.videoId}>
                    <td>{video.title}</td>
                    <td>{video.course?.title ?? 'Standalone'}</td>
                    <td>{seconds(video.paidMs)} Sek.</td>
                    <td>{seconds(video.trialMs)} Sek.</td>
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
