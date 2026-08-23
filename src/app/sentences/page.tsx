import { getCurrentUser } from "@/lib/session";
import { SentenceDashboard } from "@/components/SentenceDashboard";

export default async function SentencesPage() {
  const currentUser = await getCurrentUser();
  return (
    <SentenceDashboard 
      currentUser={currentUser ? {
        uid: currentUser.uid,
        email: currentUser.email,
        name: currentUser.name,
        picture: currentUser.picture,
      } : null}
    />
  );
}
