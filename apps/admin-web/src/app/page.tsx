'use client';
import { FormEvent, useState } from 'react';

export default function AdminHome() {
  const [key, setKey] = useState('');
  const [stats, setStats] = useState<{
    users: number;
    trainers: number;
    videos: number;
    activeAssessmentQuestions: number;
  } | null>(null);
  const [error, setError] = useState('');
  async function load(event: FormEvent) {
    event.preventDefault();
    setError('');
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_ADMIN_API_URL ?? 'http://localhost:4001'}/admin/stats`,
      { headers: { 'x-admin-key': key } },
    );
    if (!response.ok) {
      setError('Ungültiger Admin-Schlüssel.');
      return;
    }
    setStats(await response.json());
  }
  return (
    <main style={{ padding: 48 }}>
      <p style={{ color: '#c63d32', fontWeight: 800 }}>MATIQ ADMIN</p>
      <h1>Redaktion und Verwaltung</h1>
      <p>Lokale Redaktion für MATIQ-Inhalte und Assessment-Regeln.</p>
      <form onSubmit={load} style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
        <label>
          Lokaler Admin-Schlüssel
          <input type="password" value={key} onChange={(event) => setKey(event.target.value)} />
        </label>
        <button>Dashboard laden</button>
      </form>
      {error && <p style={{ color: '#a5221a' }}>{error}</p>}
      {stats && (
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 32 }}
        >
          <div className="shell">
            <strong>{stats.users}</strong>
            <p>Mitglieder</p>
          </div>
          <div className="shell">
            <strong>{stats.trainers}</strong>
            <p>Trainer</p>
          </div>
          <div className="shell">
            <strong>{stats.videos}</strong>
            <p>Videos</p>
          </div>
          <div className="shell">
            <strong>{stats.activeAssessmentQuestions}</strong>
            <p>Assessment-Fragen</p>
          </div>
        </div>
      )}
    </main>
  );
}
