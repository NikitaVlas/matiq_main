import ResendVerificationForm from '../../features/auth/ResendVerificationForm';

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email = '' } = await searchParams;
  return (
    <main>
      <section className="shell">
        <p className="eyebrow">Fast geschafft</p>
        <h1>Prüfe dein Postfach</h1>
        <p>Wir haben dir einen Bestätigungslink gesendet. Er ist 24 Stunden gültig.</p>
        <ResendVerificationForm email={email} />
      </section>
    </main>
  );
}
