import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      <p className="eyebrow">Editorial Combat Learning</p>
      <h1>DEIN GAME. DEIN WEG.</h1>
      <p>MATIQ verbindet Expertenwissen mit einer persönlichen Roadmap für BJJ und No-Gi.</p>
      <p>
        <Link href="/register">Kostenlos registrieren</Link>
      </p>
    </main>
  );
}
