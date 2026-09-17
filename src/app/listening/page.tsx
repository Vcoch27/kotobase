import type { Metadata } from "next";
import { ListeningDashboard } from "@/components/ListeningDashboard";
import { ListeningSignIn } from "@/components/ListeningSignIn";
import { getCurrentUser } from "@/lib/session";
import "./listening.css";

export const metadata: Metadata = {
  title: "Luyện nghe N3 · Lộ trình 7 tuần | KotoBase",
  description: "49 buổi luyện nghe N3 từ Google Drive của bạn: nghe kỹ, lặp A–B, ôn cách quãng và đo tiến bộ với đề chưa học.",
};

export default async function ListeningPage() {
  const user = await getCurrentUser();
  if (!user?.uid) return <ListeningSignIn />;
  return <ListeningDashboard />;
}
