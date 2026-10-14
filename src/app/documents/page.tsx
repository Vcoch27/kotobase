import { getCurrentUser } from "@/lib/session";
import { DocumentViewer } from "@/components/DocumentViewer";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tài liệu & Giáo trình N3 | KotoBase",
  description: "Trình đọc tài liệu, giáo trình N3 Kanji, Từ vựng, Ngữ pháp trực tuyến trên KotoBase",
};

export default async function DocumentsPage() {
  const currentUser = await getCurrentUser();
  return (
    <DocumentViewer
      currentUser={currentUser ? {
        uid: currentUser.uid,
        email: currentUser.email,
        name: currentUser.name,
        picture: currentUser.picture,
      } : null}
    />
  );
}
