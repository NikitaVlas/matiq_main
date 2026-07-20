import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MATIQ',
  description: 'Dein persönlicher Weg im Grappling.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
