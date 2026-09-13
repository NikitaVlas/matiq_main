import type { Metadata } from 'next';
import './globals.css';
import { AdminLanguageBar } from '../shared/i18n';

export const metadata: Metadata = {
  title: 'MATIQ Admin',
  description: 'Interne Verwaltung der MATIQ Lernplattform.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body style={{ fontFamily: 'Arial', margin: 0 }}>
        <AdminLanguageBar />
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
      </body>
    </html>
  );
}
