import { redirect } from "next/navigation";

export default async function SecretRevealRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/secret?id=${id}`);
}
