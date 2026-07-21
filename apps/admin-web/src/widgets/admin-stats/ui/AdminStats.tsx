export function AdminStats({
  stats,
}: {
  stats: { users: number; trainers: number; videos: number; activeAssessmentQuestions: number };
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 32 }}>
      {Object.entries(stats).map(([label, value]) => (
        <div className="shell" key={label}>
          <strong>{value}</strong>
          <p>{label}</p>
        </div>
      ))}
    </div>
  );
}
