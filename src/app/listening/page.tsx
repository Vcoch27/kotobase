import type { Metadata } from "next";
import { ListeningDashboard } from "@/components/ListeningDashboard";
import "./listening.css";

export const metadata: Metadata = {
  title: "Luyện nghe N3 · Lộ trình 7 tuần | KotoBase",
  description: "49 buổi luyện nghe N3 từ Google Drive của bạn: nghe kỹ, lặp A–B, ôn cách quãng và đo tiến bộ với đề chưa học.",
};

export default function ListeningPage() {
  return <ListeningDashboard />;
}
