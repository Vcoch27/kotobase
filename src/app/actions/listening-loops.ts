"use server";

import { createHash } from "crypto";
import { FieldPath } from "firebase-admin/firestore";
import { unstable_cache, revalidateTag } from "next/cache";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/session";
import { listeningExams } from "@/lib/listening-plan";
import { emptyLoopSet, validateLoops, type LoopSet, type SharedLoopSet } from "@/lib/listening-loops";

const files = new Set(listeningExams.map(exam => exam.driveFileId));
const userKey = (uid: string) => createHash("sha256").update(uid).digest("hex");
const ownTag = (uid: string, file: string) => `loops-own:${userKey(uid)}:${file}`;
const groupTag = (file: string) => `loops-group:${file}`;
const privateRef = (uid: string, file: string) => adminDb.collection("listening_loop_users").doc(userKey(uid)).collection("exams").doc(file);
const sharedCollection = (file: string) => adminDb.collection("listening_loop_groups").doc(file).collection("sets");

async function authorize(file: string, expectedUserId: string) {
  const user = await getCurrentUser();
  if (!user?.uid || user.uid !== expectedUserId) throw new Error("Phiên đăng nhập đã thay đổi. Hãy tải lại trang và đăng nhập.");
  if (!files.has(file)) throw new Error("Đề nghe không hợp lệ.");
  return user;
}

function readSet(data: FirebaseFirestore.DocumentData | undefined): LoopSet {
  if (!data) return emptyLoopSet();
  return { loops: validateLoops(data.loops), shared: data.shared === true, revision: data.revision };
}

export async function getMyListeningLoops(file: string, expectedUserId: string, refresh = false) {
  try {
    const user = await authorize(file, expectedUserId);
    const tag = ownTag(user.uid, file);
    if (refresh) revalidateTag(tag);
    // Authenticate outside the cache; UID and exam are both in the cache key.
    const data = await unstable_cache(async () => readSet((await privateRef(user.uid, file).get()).data()), [tag], { tags: [tag], revalidate: 3600 })();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error && /đăng nhập|hợp lệ/.test(error.message) ? error.message : "Chưa tải được các đoạn đã lưu. Vui lòng thử lại." };
  }
}

export async function getSharedListeningLoops(file: string, expectedUserId: string, cursor: string | null = null, refresh = false) {
  try {
    await authorize(file, expectedUserId);
    if (cursor !== null && !/^[a-f0-9]{64}$/.test(cursor)) throw new Error("Trang không hợp lệ.");
    const tag = groupTag(file);
    if (refresh) revalidateTag(tag);
    const data = await unstable_cache(async () => {
      let query = sharedCollection(file).orderBy(FieldPath.documentId()).limit(20);
      if (cursor) query = query.startAfter(cursor);
      const snapshot = await query.get();
      const sets: SharedLoopSet[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return { ownerId: data.ownerId, ownerName: data.ownerName, loops: validateLoops(data.loops), updatedAt: data.updatedAt };
      });
      return { sets, nextCursor: snapshot.size === 20 ? snapshot.docs[19].id : null };
    }, [tag, cursor || "first"], { tags: [tag], revalidate: 300 })();
    return { success: true as const, data };
  } catch {
    return { success: false as const, error: "Chưa tải được bộ đoạn Public. Kiểm tra đăng nhập và thử lại." };
  }
}

export async function saveListeningLoops(file: string, expectedUserId: string, input: LoopSet) {
  try {
    const user = await authorize(file, expectedUserId);
    if (!input || typeof input.shared !== "boolean" || !Number.isSafeInteger(input.revision) || input.revision < 0) throw new Error("Dữ liệu lưu không hợp lệ.");
    const loops = validateLoops(input.loops);
    const data: LoopSet = { loops, shared: input.shared && loops.length > 0, revision: input.revision + 1 };
    const updatedAt = new Date().toISOString();
    // One transactional document read prevents stale tabs/devices overwriting edits.
    await adminDb.runTransaction(async transaction => {
      const ref = privateRef(user.uid, file);
      const previous = await transaction.get(ref);
      if ((previous.data()?.revision ?? 0) !== input.revision) throw new Error("CONFLICT");
      transaction.set(ref, { ...data, updatedAt });
      const sharedRef = sharedCollection(file).doc(userKey(user.uid));
      if (data.shared) transaction.set(sharedRef, { ownerId: user.uid, ownerName: (user.name || "Thành viên").slice(0, 80), loops, updatedAt });
      else if (previous.data()?.shared) transaction.delete(sharedRef);
    });
    revalidateTag(ownTag(user.uid, file));
    revalidateTag(groupTag(file));
    return { success: true as const, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "CONFLICT") return { success: false as const, conflict: true, error: "Bộ đoạn đã đổi trên thiết bị khác. Nháp của bạn vẫn giữ nguyên; tải bản mới trước khi lưu tiếp." };
    return { success: false as const, conflict: false, error: /đăng nhập|hợp lệ|Mỗi đề|Tên đoạn|Mốc B|Mã đoạn/.test(message) ? message : "Chưa lưu được. Nháp vẫn được giữ trong phiên này; hãy thử lại." };
  }
}
