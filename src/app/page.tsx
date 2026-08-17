import { Dashboard } from "@/components/Dashboard";
import { getCurrentUser } from "@/lib/session";

export default async function Home() {
  // Đọc user session phía server, truyền xuống Dashboard
  const currentUser = await getCurrentUser();
  
  return (
    <Dashboard 
      currentUser={currentUser ? {
        uid: currentUser.uid,
        email: currentUser.email,
        name: currentUser.name,
        picture: currentUser.picture,
      } : null}
    />
  );
}
