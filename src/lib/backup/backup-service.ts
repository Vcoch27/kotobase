import zlib from "zlib";
import { adminDb } from "../firebase-admin";
import { serializeFirestoreValue, SerializedValue } from "./firestore-serializer";
import {
  getDriveAccessToken,
  ensureBackupFolder,
  uploadToDrive,
  cleanOldBackups,
  DriveFileInfo,
  RetentionResult,
} from "./google-drive";

export interface BackupDoc {
  _id: string;
  _path: string;
  data: { [key: string]: SerializedValue };
  _subcollections?: { [subcollectionName: string]: BackupDoc[] };
}

export interface CollectionBackup {
  collectionName: string;
  documents: BackupDoc[];
}

export interface BackupPayload {
  metadata: {
    formatVersion: string;
    databaseType: string;
    projectId: string;
    createdAt: string;
    timezone: string;
    totalCollections: number;
    totalDocuments: number;
    collections: Array<{ name: string; documentCount: number }>;
  };
  data: {
    [collectionName: string]: BackupDoc[];
  };
}

export interface BackupResult {
  success: boolean;
  fileName: string;
  databaseType: string;
  projectId: string;
  createdAt: string;
  timezone: string;
  totalCollections: number;
  totalDocuments: number;
  collections: Array<{ name: string; documentCount: number }>;
  rawSizeBytes: number;
  compressedSizeBytes: number;
  compressionRatio: string;
  drive: {
    folderId: string;
    folderName: string;
    folderCreated: boolean;
    fileId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    createdTime: string;
  };
  retention: RetentionResult;
  durationMs: number;
}

/**
 * Get Vietnam (Asia/Ho_Chi_Minh) formatted timestamp
 */
export function getVietnamTimestamp(): { fileNameDate: string; isoDate: string } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "00";
  const YYYY = get("year");
  const MM = get("month");
  const DD = get("day");
  const HH = get("hour");
  const mm = get("minute");
  const ss = get("second");

  return {
    fileNameDate: `${YYYY}-${MM}-${DD}_${HH}${mm}${ss}`,
    isoDate: `${YYYY}-${MM}-${DD}T${HH}:${mm}:${ss}+07:00`,
  };
}

/**
 * Recursively backup a collection and any subcollections inside documents
 */
async function crawlCollection(
  collectionRef: FirebaseFirestore.CollectionReference
): Promise<{ docs: BackupDoc[]; count: number }> {
  // Strict read-only operation
  const snapshot = await collectionRef.get();
  const docs: BackupDoc[] = [];
  let totalDocCount = snapshot.size;

  // Process in concurrent batches of 30 to avoid sequential roundtrips
  const BATCH_SIZE = 30;
  for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
    const chunk = snapshot.docs.slice(i, i + BATCH_SIZE);
    const chunkResults = await Promise.all(
      chunk.map(async (doc) => {
        const rawData = doc.data();
        const serializedData = serializeFirestoreValue(rawData) as { [key: string]: SerializedValue };

        const backupDoc: BackupDoc = {
          _id: doc.id,
          _path: doc.ref.path,
          data: serializedData,
        };

        // Check for subcollections
        const subcollections = await doc.ref.listCollections();
        let subCount = 0;
        if (subcollections.length > 0) {
          backupDoc._subcollections = {};
          for (const subcol of subcollections) {
            const subResult = await crawlCollection(subcol);
            backupDoc._subcollections[subcol.id] = subResult.docs;
            subCount += subResult.count;
          }
        }

        return { backupDoc, subCount };
      })
    );

    for (const res of chunkResults) {
      docs.push(res.backupDoc);
      totalDocCount += res.subCount;
    }
  }

  return { docs, count: totalDocCount };
}

/**
 * Executes full Cloud Firestore backup to Google Drive
 */
export async function runFirestoreBackup(options?: {
  onProgress?: (step: string, details?: any) => void;
}): Promise<BackupResult> {
  const startTime = Date.now();
  const log = options?.onProgress || (() => {});

  log("init", "Starting Cloud Firestore backup process...");

  // 1. Discover all root collections dynamically
  log("discovery", "Scanning all root collections via adminDb.listCollections()...");
  const rootCollections = await adminDb.listCollections();
  log("discovery", `Found ${rootCollections.length} root collections.`);

  const backupData: { [collectionName: string]: BackupDoc[] } = {};
  const collectionStats: Array<{ name: string; documentCount: number }> = [];
  let overallTotalDocs = 0;

  // 2. Read documents & nested subcollections recursively (READ ONLY)
  for (const col of rootCollections) {
    log("export", `Reading collection: ${col.id}...`);
    const { docs, count } = await crawlCollection(col);
    backupData[col.id] = docs;
    collectionStats.push({ name: col.id, documentCount: docs.length });
    overallTotalDocs += count;
  }

  const { fileNameDate, isoDate } = getVietnamTimestamp();
  const fileName = `kotobase_backup_${fileNameDate}.json.gz`;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "unknown-project";

  const payload: BackupPayload = {
    metadata: {
      formatVersion: "1.0.0",
      databaseType: "Cloud Firestore",
      projectId,
      createdAt: isoDate,
      timezone: "Asia/Ho_Chi_Minh",
      totalCollections: rootCollections.length,
      totalDocuments: overallTotalDocs,
      collections: collectionStats,
    },
    data: backupData,
  };

  // 3. Serialize and compress to gzip
  log("compress", "Serializing data to JSON and compressing with Gzip...");
  const rawJson = JSON.stringify(payload, null, 2);
  const rawSizeBytes = Buffer.byteLength(rawJson, "utf8");

  const gzippedBuffer = zlib.gzipSync(Buffer.from(rawJson, "utf8"), { level: 9 });
  const compressedSizeBytes = gzippedBuffer.length;
  const compressionRatio = ((1 - compressedSizeBytes / rawSizeBytes) * 100).toFixed(1) + "%";

  log("compress", `Compressed from ${(rawSizeBytes / 1024).toFixed(1)} KB to ${(compressedSizeBytes / 1024).toFixed(1)} KB (${compressionRatio} reduction).`);

  // 4. Google Drive OAuth and Folder preparation
  log("drive_auth", "Authenticating with Google Drive API...");
  const accessToken = await getDriveAccessToken({
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN || "",
  });

  log("drive_folder", "Verifying backup folder in Google Drive...");
  const folderInfo = await ensureBackupFolder(accessToken, process.env.GOOGLE_DRIVE_FOLDER_ID);
  log(
    "drive_folder",
    `Using Google Drive folder '${folderInfo.folderName}' (${folderInfo.folderId}) ${folderInfo.isNew ? "[CREATED NEW]" : "[EXISTING]"}`
  );

  // 5. Upload backup file to Google Drive
  log("drive_upload", `Uploading ${fileName} to Google Drive...`);
  const uploadedFile: DriveFileInfo = await uploadToDrive({
    accessToken,
    folderId: folderInfo.folderId,
    fileName,
    buffer: gzippedBuffer,
  });

  log("drive_verify", `Upload confirmed. File ID: ${uploadedFile.id}, Size: ${uploadedFile.size} bytes.`);

  // 6. Retention cleanup (files older than 30 days)
  log("retention", "Checking retention policy (cleaning backups older than 30 days)...");
  const retentionResult = await cleanOldBackups(accessToken, folderInfo.folderId, 30);
  log(
    "retention",
    `Retention complete: ${retentionResult.deletedFiles.length} expired file(s) deleted, ${retentionResult.retainedFiles.length} file(s) retained.`
  );

  const durationMs = Date.now() - startTime;
  log("complete", `Backup completed successfully in ${durationMs}ms.`);

  return {
    success: true,
    fileName,
    databaseType: "Cloud Firestore",
    projectId,
    createdAt: isoDate,
    timezone: "Asia/Ho_Chi_Minh",
    totalCollections: rootCollections.length,
    totalDocuments: overallTotalDocs,
    collections: collectionStats,
    rawSizeBytes,
    compressedSizeBytes,
    compressionRatio,
    drive: {
      folderId: folderInfo.folderId,
      folderName: folderInfo.folderName,
      folderCreated: folderInfo.isNew,
      fileId: uploadedFile.id,
      fileName: uploadedFile.name,
      fileSize: uploadedFile.size,
      mimeType: uploadedFile.mimeType,
      createdTime: uploadedFile.createdTime,
    },
    retention: retentionResult,
    durationMs,
  };
}
