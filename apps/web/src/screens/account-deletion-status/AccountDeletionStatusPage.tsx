'use client';

import { useCallback, useEffect, useState } from 'react';
import { userApiResponse } from '../../shared/api/client';

type StoredRequest = { requestId: string; statusToken: string; statusTokenExpiresAt: string };
type DeletionStatus = {
  requestId: string;
  status: 'PENDING' | 'COMPLETED';
  requestedAt: string;
  completedAt: string | null;
};

function storedRequest(): StoredRequest | null {
  try {
    const value = JSON.parse(sessionStorage.getItem('matiq.accountDeletionStatus') ?? 'null');
    return value?.requestId && value?.statusToken ? value : null;
  } catch {
    return null;
  }
}

export default function AccountDeletionStatusPage() {
  const [request, setRequest] = useState<StoredRequest | null>();
  const [status, setStatus] = useState<DeletionStatus>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => setRequest(storedRequest()), []);

  const refresh = useCallback(async (current: StoredRequest) => {
    setLoading(true);
    const response = await userApiResponse('/auth/account-deletion/status', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ requestId: current.requestId, statusToken: current.statusToken }),
    });
    if (!response.ok) {
      setError('Der Löschstatus ist nicht mehr verfügbar. Der Statuslink gilt höchstens 30 Tage.');
    } else {
      setStatus((await response.json()) as DeletionStatus);
      setError('');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!request || status?.status === 'COMPLETED') return;
    void refresh(request);
    const timer = window.setInterval(() => void refresh(request), 5_000);
    return () => window.clearInterval(timer);
  }, [refresh, request, status?.status]);

  return (
    <main className="settings-page">
      <header className="settings-header">
        <p className="eyebrow">Datenschutz</p>
        <h1>Kontolöschung</h1>
        <p>Hier siehst du, ob MATIQ die Löschung vollständig abgeschlossen hat.</p>
      </header>
      {request === null ? (
        <section className="settings-card">
          <h2>Kein Löschauftrag in diesem Browser</h2>
          <p>
            Der Status ist nur in dem Browser-Tab verfügbar, in dem du die Löschung gestartet hast.
          </p>
          <a className="action-link" href="/">
            Zur Startseite
          </a>
        </section>
      ) : null}
      {request ? (
        <section className="settings-card" aria-busy={loading}>
          {error ? (
            <p className="settings-message error" role="alert">
              {error}
            </p>
          ) : null}
          {!error && !status ? <p role="status">Status wird geladen...</p> : null}
          {status?.status === 'PENDING' ? (
            <>
              <h2>Löschung läuft</h2>
              <p role="status">
                Dein Zugang wurde bereits gesperrt. Die verbleibenden Daten werden verarbeitet.
              </p>
            </>
          ) : null}
          {status?.status === 'COMPLETED' ? (
            <>
              <h2>Löschung abgeschlossen</h2>
              <p role="status">
                Deine löschbaren Kontodaten wurden entfernt oder dauerhaft pseudonymisiert.
              </p>
            </>
          ) : null}
          <button disabled={loading} onClick={() => void refresh(request)}>
            {loading ? 'Wird geprüft...' : 'Status aktualisieren'}
          </button>
        </section>
      ) : null}
    </main>
  );
}
