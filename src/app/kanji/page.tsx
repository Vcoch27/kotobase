import { KanjiPageClient } from "@/components/KanjiPageClient";
import { getCurrentUser } from "@/lib/session";
import { getVocabularies } from "@/app/actions/vocabulary";
import { getFolders } from "@/app/actions/folder";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function KanjiPage() {
  // Đọc dữ liệu phía server
  const [currentUser, vocabData, folderData] = await Promise.all([
    getCurrentUser(),
    getVocabularies("all"),
    getFolders(),
  ]);

  const vocabularies = Array.isArray(vocabData) ? vocabData : [];
  const folders = Array.isArray(folderData) ? folderData : [];

  return (
    <KanjiPageClient
      vocabularies={vocabularies}
      folders={folders}
      currentUser={currentUser ? {
        uid: currentUser.uid,
        email: currentUser.email,
        name: currentUser.name,
        picture: currentUser.picture,
      } : null}
    />
  );
}
