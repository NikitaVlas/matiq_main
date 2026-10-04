import type { Metadata } from 'next';
import './globals.css';
import { Navigation, SessionVisibility } from '../features/auth/SessionVisibility';

export const metadata: Metadata = {
  title: 'MATIQ',
  description: 'Dein persönlicher Weg im Grappling.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>
        <a className="skip-link" href="#main-content">
          Zum Inhalt springen
        </a>
        <SessionVisibility>
          <Navigation />
          <div id="main-content" tabIndex={-1}>
            {children}
          </div>
        </SessionVisibility>
      </body>
    </html>
  );
}
