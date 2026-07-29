import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MATIQ',
  description: 'Dein persönlicher Weg im Grappling.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>
        <nav className="navigation" aria-label="Hauptnavigation">
          <a href="/dashboard">Dashboard</a>
          <a href="/roadmap">Roadmap</a>
          <a href="/videos">Videos</a>
          <a href="/courses">Kurse</a>
          <a href="/history">Verlauf</a>
          <a href="/subscription">Mitgliedschaft</a>
          <a href="/onboarding/profile">Profil</a>
        </nav>
        {children}
      </body>
    </html>
  );
}
