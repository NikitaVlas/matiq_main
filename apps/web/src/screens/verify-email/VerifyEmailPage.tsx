import { VerifyEmailForm } from '../../features/auth/VerifyEmailForm';

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  return <VerifyEmailForm initialToken={params.token ?? ''} />;
}
