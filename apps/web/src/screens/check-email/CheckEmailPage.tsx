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
        <h2>Prüfe dein Postfach</h2>
        <p>Wir haben dir einen Bestätigungslink gesendet. Er ist 24 Stunden gültig.</p>
        <ResendVerificationForm email={email} />
      </section>
    </main>
  );
}
