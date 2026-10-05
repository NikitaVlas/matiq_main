'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { userApiResponse } from '../../shared/api/client';

type SessionState = 'loading' | 'guest' | 'authenticated';
const SessionContext = createContext<SessionState>('loading');

export function SessionVisibility({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [result, setResult] = useState<{ pathname: string; state: SessionState }>();
  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    const timer = setTimeout(() => controller.abort(), 10000);
    void userApiResponse('/auth/me', { signal: controller.signal, cache: 'no-store' })
      .then((response) => {
        if (!disposed) setResult({ pathname, state: response.ok ? 'authenticated' : 'guest' });
      })
      .catch(() => {
        if (!disposed) setResult({ pathname, state: 'guest' });
      })
      .finally(() => clearTimeout(timer));
    return () => {
      disposed = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [pathname]);
  return (
    <SessionContext.Provider value={result?.pathname === pathname ? result.state : 'loading'}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionVisibility() {
  return useContext(SessionContext);
}

export function VideoAccessGate({ children }: { children: ReactNode }) {
  const session = useSessionVisibility();
  if (session === 'authenticated') return children;
  return (
    <main className="public-home">
      {session === 'loading' ? (
        <p role="status">Anmeldung wird geprüft …</p>
      ) : (
        <>
          <h1>Melde dich an, um Videos zu entdecken.</h1>
          <p>Der Videokatalog ist nach der Anmeldung verfügbar.</p>
          <Link className="action-link" href="/login">
            Anmelden
          </Link>
          <p>
            <Link href="/register">Kostenlos registrieren</Link>
          </p>
        </>
      )}
    </main>
  );
}

export function Navigation() {
  const authenticated = useSessionVisibility() === 'authenticated';
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError('');
    try {
      const response = await userApiResponse('/auth/logout', {
        method: 'POST',
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error('LOGOUT_FAILED');
      window.location.assign('/login');
    } catch {
      setLogoutError('Abmelden fehlgeschlagen. Bitte erneut versuchen.');
      setLoggingOut(false);
    }
  }
  return (
    <nav
      className={`navigation${authenticated ? '' : ' navigation-guest'}`}
      aria-label="Hauptnavigation"
    >
      <Link className="navigation-brand" href="/">
        MATIQ
      </Link>
      {authenticated && (
        <>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/roadmap">Roadmap</Link>
          <Link href="/videos">Videos</Link>
        </>
      )}
      <Link href="/courses">Kurse</Link>
      <Link href="/trainers">Trainer</Link>
      {authenticated ? (
        <>
          <Link href="/history">Verlauf</Link>
          <Link href="/subscription">Mitgliedschaft</Link>
          <div className="navigation-account">
            <Link href="/settings">Einstellungen</Link>
            <button
              className="navigation-logout"
              type="button"
              disabled={loggingOut}
              onClick={logout}
            >
              {loggingOut ? 'Abmelden …' : 'Ausloggen'}
            </button>
            {logoutError && (
              <span className="error" role="alert">
                {logoutError}
              </span>
            )}
          </div>
        </>
      ) : (
        <div className="navigation-account">
          <Link href="/login">Anmelden</Link>
          <Link href="/register">Registrieren</Link>
        </div>
      )}
    </nav>
  );
}
