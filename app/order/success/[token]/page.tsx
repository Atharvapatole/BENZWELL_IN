import { redirect } from 'next/navigation';

export default async function OrderSuccessPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  redirect(`/download/${token}`);
}

