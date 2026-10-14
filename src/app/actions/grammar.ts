"use server";

import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath, revalidateTag } from "next/cache";

export async function getGrammarFolders(): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const snapshot = await adminDb.collection("grammar_folders").orderBy("name", "asc").get();
    const folders = snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      parentId: doc.data().parentId || null,
      ownerId: doc.data().ownerId || null,
      ownerEmail: doc.data().ownerEmail || null,
      ownerName: doc.data().ownerName || null,
      isPublic: doc.data().isPublic !== false,
      _count: { folderGrammars: 0 }
    }));

    await Promise.all(folders.map(async (folder) => {
      try {
        const countSnap = await adminDb.collection("grammars")
          .where("folderIds", "array-contains", folder.id)
          .count()
          .get();
        folder._count.folderGrammars = countSnap.data().count;
      } catch {
        folder._count.folderGrammars = 0;
      }
    }));

    return { success: true, data: folders };
  } catch (error: any) {
    console.error("Lỗi getGrammarFolders:", error);
    return { success: false, error: "Lỗi khi lấy danh sách thư mục ngữ pháp." };
  }
}

export async function createGrammarFolder(name: string, parentId?: string) {
  if (!name.trim()) return { success: false, error: "Tên thư mục không được trống." };
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, error: "Bạn cần đăng nhập." };
  try {
    const docRef = await adminDb.collection("grammar_folders").add({
      name: name.trim(), parentId: parentId || null,
      ownerId: currentUser.uid, ownerEmail: currentUser.email,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    revalidatePath("/grammar"); revalidateTag("grammar_folders"); revalidateTag("grammars");
    return { success: true, data: { id: docRef.id } };
  } catch { return { success: false, error: "Không thể tạo thư mục." }; }
}

export async function updateGrammarFolder(id: string, name: string) {
  if (!name.trim()) return { success: false, error: "Tên không được trống." };
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, error: "Bạn cần đăng nhập." };
  try {
    const docRef = adminDb.collection("grammar_folders").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return { success: false, error: "Thư mục không tồn tại." };
    if (doc.data()?.ownerId !== currentUser.uid && currentUser.email !== "hoangtungmy123@gmail.com") return { success: false, error: "Không có quyền." };
    await docRef.update({ name: name.trim(), updatedAt: new Date().toISOString() });
    revalidatePath("/grammar"); revalidateTag("grammar_folders"); revalidateTag("grammars");
    return { success: true };
  } catch { return { success: false, error: "Không thể cập nhật thư mục." }; }
}

export async function deleteGrammarFolder(id: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, error: "Bạn cần đăng nhập." };
  try {
    const docRef = adminDb.collection("grammar_folders").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      revalidatePath("/grammar");
      revalidateTag("grammar_folders");
      revalidateTag("grammars");
      return { success: true };
    }
    if (doc.data()?.ownerId !== currentUser.uid && currentUser.email !== "hoangtungmy123@gmail.com") return { success: false, error: "Không có quyền." };
    const grammarsQuery = await adminDb.collection("grammars").where("folderIds", "array-contains", id).get();
    const batch = adminDb.batch();
    grammarsQuery.docs.forEach(gDoc => batch.delete(gDoc.ref));
    batch.delete(docRef);
    await batch.commit();
    revalidatePath("/grammar"); revalidateTag("grammar_folders"); revalidateTag("grammars");
    return { success: true };
  } catch { return { success: false, error: "Không thể xóa thư mục." }; }
}

export async function getGrammarsByFolder(folderId: string | "all"): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    let snapshot;
    if (folderId === "all" || !folderId) {
      snapshot = await adminDb.collection("grammars").get();
    } else {
      snapshot = await adminDb.collection("grammars")
        .where("folderIds", "array-contains", folderId)
        .get();
    }
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { success: true, data };
  } catch (error: any) {
    console.error("Lỗi getGrammarsByFolder:", error);
    return { success: false, error: "Lỗi lấy danh sách ngữ pháp." };
  }
}

export async function createGrammar(input: {
  structure: string; formation?: string; meaning: string;
  nuance?: string; example?: string; exampleMeaning?: string;
  jlptLevel?: string; usageContext?: string; folderId?: string;
}) {
  if (!input.structure.trim() || !input.meaning.trim()) return { success: false, error: "Cấu trúc và ý nghĩa là bắt buộc." };
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, error: "Bạn cần đăng nhập." };
  try {
    const docRef = await adminDb.collection("grammars").add({
      structure: input.structure.trim(), formation: input.formation?.trim() || null,
      meaning: input.meaning.trim(), nuance: input.nuance?.trim() || null,
      example: input.example?.trim() || null, exampleMeaning: input.exampleMeaning?.trim() || null,
      jlptLevel: input.jlptLevel || null, usageContext: input.usageContext || null,
      folderIds: input.folderId ? [input.folderId] : [],
      ownerId: currentUser.uid, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    revalidatePath("/grammar"); revalidateTag("grammar_folders"); revalidateTag("grammars");
    return { success: true, data: { id: docRef.id } };
  } catch { return { success: false, error: "Không thể thêm ngữ pháp." }; }
}

export async function updateGrammar(id: string, input: {
  structure: string; formation?: string; meaning: string;
  nuance?: string; example?: string; exampleMeaning?: string;
  jlptLevel?: string; usageContext?: string; folderId?: string;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, error: "Bạn cần đăng nhập." };
  try {
    const docRef = adminDb.collection("grammars").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return { success: false, error: "Ngữ pháp không tồn tại." };
    if (doc.data()?.ownerId !== currentUser.uid && currentUser.email !== "hoangtungmy123@gmail.com") return { success: false, error: "Không có quyền." };
    await docRef.update({
      structure: input.structure.trim(), formation: input.formation?.trim() || null,
      meaning: input.meaning.trim(), nuance: input.nuance?.trim() || null,
      example: input.example?.trim() || null, exampleMeaning: input.exampleMeaning?.trim() || null,
      jlptLevel: input.jlptLevel || null, usageContext: input.usageContext || null,
      folderIds: input.folderId ? [input.folderId] : (doc.data()?.folderIds || []),
      updatedAt: new Date().toISOString(),
    });
    revalidatePath("/grammar"); revalidateTag("grammar_folders"); revalidateTag("grammars");
    return { success: true };
  } catch { return { success: false, error: "Không thể sửa ngữ pháp." }; }
}

export async function deleteGrammar(id: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, error: "Bạn cần đăng nhập." };
  try {
    const docRef = adminDb.collection("grammars").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return { success: false, error: "Ngữ pháp không tồn tại." };
    if (doc.data()?.ownerId !== currentUser.uid && currentUser.email !== "hoangtungmy123@gmail.com") return { success: false, error: "Không có quyền." };
    await docRef.delete();
    revalidatePath("/grammar"); revalidateTag("grammar_folders"); revalidateTag("grammars");
    return { success: true };
  } catch { return { success: false, error: "Không thể xóa ngữ pháp." }; }
}
export async function createBulkGrammars(jsonString: string, targetFolderId?: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, error: "Bạn cần đăng nhập." };

  try {
    const parsedJson = JSON.parse(jsonString);
    let itemsToProcess: any[] = [];

    // Hỗ trợ cả định dạng { source, count, lessons: [...] } từ shinkanzen scraper
    if (parsedJson && Array.isArray(parsedJson.lessons)) {
      itemsToProcess = parsedJson.lessons.map((lesson: any) => {
        const blocks = Array.isArray(lesson.blocks) ? lesson.blocks.map((blockText: string, bIdx: number) => {
          const viDuSplit = blockText.split(/Ví\s*dụ\s*:\s*/i);
          const mainPart = viDuSplit[0].trim();
          const examplesPart = viDuSplit[1] ? viDuSplit[1].trim() : '';
          const lines = mainPart.split('\n').map((l: string) => l.trim()).filter(Boolean);

          const formationLines: string[] = [];
          const explanationLines: string[] = [];
          let isFormation = true;

          for (let line of lines) {
            if (isFormation && (line.includes('＋') || line.includes('+') || line.startsWith('[') || line.startsWith('［') || line.includes('形'))) {
              formationLines.push(line);
            } else {
              isFormation = false;
              explanationLines.push(line);
            }
          }

          const jpnExpl: string[] = [];
          const vieExpl: string[] = [];
          for (let l of explanationLines) {
            if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/.test(l)) {
              vieExpl.push(l);
            } else {
              jpnExpl.push(l);
            }
          }

          const examples: Array<{ jpn: string; vie: string }> = [];
          if (examplesPart) {
            const rawExs = examplesPart.split(/\n(?=\d+\.\s*)/g);
            for (let rawEx of rawExs) {
              const exLines = rawEx.split('\n').map((l: string) => l.trim()).filter(Boolean);
              if (exLines.length >= 2) {
                examples.push({ jpn: exLines[0].replace(/^\d+\.\s*/, ''), vie: exLines.slice(1).join(' ') });
              } else if (exLines.length === 1) {
                examples.push({ jpn: exLines[0].replace(/^\d+\.\s*/, ''), vie: '' });
              }
            }
          }

          return {
            blockNumber: bIdx + 1,
            formation: formationLines.join('\n'),
            meaning: vieExpl.join('\n'),
            nuance: jpnExpl.join('\n'),
            examples,
          };
        }) : [];

        const allExamples = blocks.flatMap((b: any) => b.examples);
        return {
          number: lesson.number,
          title: lesson.title,
          structure: lesson.grammar || lesson.title?.replace(/^\d+\.\s*/, '') || '',
          formation: blocks.map((b: any) => b.formation).filter(Boolean).join('\n'),
          meaning: blocks.map((b: any) => b.meaning).filter(Boolean).join('\n---\n') || lesson.title,
          nuance: blocks.map((b: any) => b.nuance).filter(Boolean).join('\n---\n'),
          example: allExamples[0]?.jpn || null,
          exampleMeaning: allExamples[0]?.vie || null,
          examples: allExamples,
          blocks,
          jlptLevel: 'N3',
          usageContext: 'writing,conversation',
          sourceUrl: lesson.url || null,
        };
      });
    } else if (Array.isArray(parsedJson)) {
      itemsToProcess = parsedJson;
    } else {
      return { success: false, error: "Dữ liệu JSON không hợp lệ (cần dạng mảng hoặc đối tượng chứa mảng lessons)." };
    }

    const batch = adminDb.batch();
    const grammarsRef = adminDb.collection("grammars");
    const baseTime = Date.now();
    
    let count = 0;
    for (let i = 0; i < itemsToProcess.length; i++) {
      const item = itemsToProcess[i];
      if (!item.structure || !item.meaning) continue;

      const docRef = grammarsRef.doc();
      const createdAt = new Date(baseTime + (item.number ? item.number * 1000 : i * 100)).toISOString();

      batch.set(docRef, {
        number: item.number ?? (i + 1),
        title: item.title || null,
        structure: item.structure.trim(),
        formation: item.formation?.trim() || null,
        meaning: item.meaning.trim(),
        nuance: item.nuance?.trim() || null,
        example: item.example?.trim() || null,
        exampleMeaning: item.exampleMeaning?.trim() || null,
        examples: item.examples || null,
        blocks: item.blocks || null,
        jlptLevel: item.jlptLevel || null,
        usageContext: item.usageContext || null,
        sourceUrl: item.sourceUrl || null,
        folderIds: targetFolderId ? [targetFolderId] : [],
        ownerId: currentUser.uid,
        createdAt: createdAt,
        updatedAt: createdAt,
      });
      
      count++;
      if (count % 500 === 0) await batch.commit();
    }

    if (count % 500 !== 0) await batch.commit();

    revalidatePath("/grammar"); revalidateTag("grammar_folders"); revalidateTag("grammars");
    return { success: true, count };
  } catch (error: any) {
    console.error("Lỗi import ngữ pháp:", error);
    return { success: false, error: "Không thể lưu dữ liệu." };
  }
}
