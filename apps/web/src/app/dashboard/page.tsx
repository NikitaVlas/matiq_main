'use client';

import { useEffect, useState } from 'react';

const api = process.env.NEXT_PUBLIC_USER_API_URL ?? 'http://localhost:4000';

export default function DashboardPage() {
  const [result, setResult] = useState<{
    completed: boolean;
    roadmap: { title: string; videos: { id: string; title: string }[] }[];
  }>();
  const [hasAccess, setHasAccess] = useState(false);
  useEffect(() => {
    fetch(`${api}/assessment/result`, { credentials: 'include' }).then((r) => r.json()).then(setResult);
    fetch(`${api}/subscription`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { hasAccess: false }))
      .then((s) => setHasAccess(Boolean(s.hasAccess)));
  }, []);
  const next = result?.roadmap[0];
  return <main><p className="eyebrow">Dashboard</p><h1>DEIN NÄCHSTER SCHRITT</h1>{!result ? <p>Wird geladen …</p> : null}{result && !result.completed ? <a href="/assessment">Assessment fortsetzen</a> : null}{next ? <section className="shell"><h2>{next.title}</h2>{next.videos[0] ? <a href={hasAccess ? `/video/${next.videos[0].id}` : '/subscription'}>{hasAccess ? `Weiterlernen: ${next.videos[0].title}` : 'Zugang freischalten'}</a> : <a href="/videos">Videos entdecken</a>}</section> : null}</main>;
}
