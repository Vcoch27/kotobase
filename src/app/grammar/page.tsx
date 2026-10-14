import { getCurrentUser } from "@/lib/session";
import { GrammarDashboard } from "@/components/GrammarDashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function GrammarPage() {
  const currentUser = await getCurrentUser();
  return (
    <GrammarDashboard
      currentUser={currentUser ? {
        uid: currentUser.uid,
        email: currentUser.email,
        name: currentUser.name,
        picture: currentUser.picture,
      } : null}
    />
  );
}
