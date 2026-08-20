import { KanjiPageClient } from "@/components/KanjiPageClient";
import { getCurrentUser } from "@/lib/session";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function KanjiPage() {
  const currentUser = await getCurrentUser();

  return (
    <KanjiPageClient
      currentUser={currentUser ? {
        uid: currentUser.uid,
        email: currentUser.email,
        name: currentUser.name,
        picture: currentUser.picture,
      } : null}
    />
  );
}
