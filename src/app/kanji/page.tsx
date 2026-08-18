import { KanjiPageClient } from "@/components/KanjiPageClient";
import { getCurrentUser } from "@/lib/session";
import { getVocabularies } from "@/app/actions/vocabulary";
import { getFolders } from "@/app/actions/folder";
import { fetchAllKanjiNotes } from "@/app/actions/kanji";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function KanjiPage() {
  // Đọc dữ liệu phía server
  const [currentUser, vocabData, folderData, kanjiData] = await Promise.all([
    getCurrentUser(),
    getVocabularies("all"),
    getFolders(),
    fetchAllKanjiNotes(),
  ]);

  const vocabularies = Array.isArray(vocabData) ? vocabData : [];
  const folders = Array.isArray(folderData) ? folderData : [];
  const initialKanjiNotes = Array.isArray(kanjiData) ? kanjiData : [];

  return (
    <KanjiPageClient
      vocabularies={vocabularies}
      folders={folders}
      initialKanjiNotes={initialKanjiNotes}
      currentUser={currentUser ? {
        uid: currentUser.uid,
        email: currentUser.email,
        name: currentUser.name,
        picture: currentUser.picture,
      } : null}
    />
  );
}
