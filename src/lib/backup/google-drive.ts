import fs from "fs";
import path from "path";

export interface GoogleDriveConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  folderId?: string;
}

export interface DriveFileInfo {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  createdTime: string;
  md5Checksum?: string;
}

export interface RetentionResult {
  deletedFiles: Array<{ id: string; name: string; createdTime: string; size: number }>;
  retainedFiles: Array<{ id: string; name: string; createdTime: string; size: number }>;
}

/**
 * Retrieve Google OAuth2 Access Token using Refresh Token
 */
export async function getDriveAccessToken(config: GoogleDriveConfig): Promise<string> {
  const { clientId, clientSecret, refreshToken } = config;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Google Drive credentials missing in environment variables.");
  }

  const tokenUrl = "https://oauth2.googleapis.com/token";
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to refresh Google Drive access token (status ${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("No access_token returned by Google OAuth2 token endpoint.");
  }

  return data.access_token;
}

/**
 * Updates GOOGLE_DRIVE_FOLDER_ID in .env file safely
 */
export function updateEnvFolderId(newFolderId: string): void {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      let content = fs.readFileSync(envPath, "utf8");
      if (content.match(/^GOOGLE_DRIVE_FOLDER_ID=.*$/m)) {
        content = content.replace(/^GOOGLE_DRIVE_FOLDER_ID=.*$/m, `GOOGLE_DRIVE_FOLDER_ID=${newFolderId}`);
      } else {
        content += `\nGOOGLE_DRIVE_FOLDER_ID=${newFolderId}\n`;
      }
      fs.writeFileSync(envPath, content, "utf8");
    }
  } catch (err) {
    console.warn("Could not automatically update .env with new GOOGLE_DRIVE_FOLDER_ID:", err);
  }
}

/**
 * Ensure a valid backup folder exists in Google Drive.
 * If GOOGLE_DRIVE_FOLDER_ID is invalid or 404 (due to drive.file scope limitation),
 * create or find folder 'KotoBase_Backups', save new ID to .env, and use it.
 */
export async function ensureBackupFolder(
  accessToken: string,
  configuredFolderId?: string
): Promise<{ folderId: string; folderName: string; isNew: boolean }> {
  // 1. Check if configured folder is accessible
  if (configuredFolderId) {
    try {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${configuredFolderId}?fields=id,name,mimeType,trashed`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (res.ok) {
        const data = (await res.json()) as { id: string; name: string; mimeType: string; trashed?: boolean };
        if (data.mimeType === "application/vnd.google-apps.folder" && !data.trashed) {
          return { folderId: data.id, folderName: data.name, isNew: false };
        }
      }
    } catch {
      // Ignore and proceed to search or create
    }
  }

  // 2. Search if 'KotoBase_Backups' was already created under this app's drive.file scope
  const searchUrl = "https://www.googleapis.com/drive/v3/files?q=name='KotoBase_Backups'+and+mimeType='application/vnd.google-apps.folder'+and+trashed=false&fields=files(id,name)";
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (searchRes.ok) {
    const searchData = (await searchRes.json()) as { files?: Array<{ id: string; name: string }> };
    if (searchData.files && searchData.files.length > 0) {
      const existing = searchData.files[0];
      updateEnvFolderId(existing.id);
      process.env.GOOGLE_DRIVE_FOLDER_ID = existing.id;
      return { folderId: existing.id, folderName: existing.name, isNew: false };
    }
  }

  // 3. Create 'KotoBase_Backups' folder
  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      name: "KotoBase_Backups",
      mimeType: "application/vnd.google-apps.folder",
    }),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`Failed to create Google Drive folder 'KotoBase_Backups' (status ${createRes.status}): ${errorText}`);
  }

  const created = (await createRes.json()) as { id: string; name: string };
  updateEnvFolderId(created.id);
  process.env.GOOGLE_DRIVE_FOLDER_ID = created.id;

  return { folderId: created.id, folderName: created.name, isNew: true };
}

/**
 * Upload gzipped backup file to Google Drive using multipart upload
 */
export async function uploadToDrive(params: {
  accessToken: string;
  folderId: string;
  fileName: string;
  buffer: Buffer;
}): Promise<DriveFileInfo> {
  const { accessToken, folderId, fileName, buffer } = params;
  const boundary = `-------KotobaseBackup${Date.now()}`;

  const metadata = JSON.stringify({
    name: fileName,
    parents: [folderId],
    mimeType: "application/gzip",
  });

  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const preContent = Buffer.from(
    delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      metadata +
      delimiter +
      "Content-Type: application/gzip\r\n" +
      "Content-Transfer-Encoding: binary\r\n\r\n",
    "utf8"
  );

  const postContent = Buffer.from(closeDelimiter, "utf8");
  const multipartBody = Buffer.concat([preContent, buffer, postContent]);

  const uploadUrl = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
      "Content-Length": String(multipartBody.length),
    },
    body: multipartBody,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Google Drive upload failed (status ${uploadRes.status}): ${errText}`);
  }

  const uploadedData = (await uploadRes.json()) as { id: string; name: string };

  // Verify and fetch complete file metadata
  return await verifyUploadedFile(accessToken, uploadedData.id);
}

/**
 * Verifies uploaded file metadata and size > 0
 */
export async function verifyUploadedFile(accessToken: string, fileId: string): Promise<DriveFileInfo> {
  const verifyUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,size,mimeType,createdTime,md5Checksum`;
  const res = await fetch(verifyUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to verify uploaded file in Google Drive: ${errText}`);
  }

  const file = (await res.json()) as {
    id: string;
    name: string;
    size?: string;
    mimeType: string;
    createdTime: string;
    md5Checksum?: string;
  };

  const size = Number(file.size || 0);
  if (size <= 0) {
    throw new Error(`Uploaded file verification failed: file size is ${size} bytes.`);
  }

  return {
    id: file.id,
    name: file.name,
    size,
    mimeType: file.mimeType,
    createdTime: file.createdTime,
    md5Checksum: file.md5Checksum,
  };
}

/**
 * Retention Policy: Remove backups older than 30 days matching kotobase_backup_*
 */
export async function cleanOldBackups(
  accessToken: string,
  folderId: string,
  retentionDays: number = 30
): Promise<RetentionResult> {
  const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const listUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false+and+mimeType!='application/vnd.google-apps.folder'&fields=files(id,name,createdTime,size)&pageSize=100`;

  const res = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to list files for retention cleanup: ${errText}`);
  }

  const data = (await res.json()) as {
    files?: Array<{ id: string; name: string; createdTime: string; size?: string }>;
  };

  const files = data.files || [];
  const backupFiles = files.filter((f) => f.name.startsWith("kotobase_backup_"));

  const deletedFiles: RetentionResult["deletedFiles"] = [];
  const retainedFiles: RetentionResult["retainedFiles"] = [];

  for (const file of backupFiles) {
    const fileTime = new Date(file.createdTime).getTime();
    const size = Number(file.size || 0);

    if (fileTime < cutoffTime) {
      try {
        const delRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (delRes.ok) {
          deletedFiles.push({
            id: file.id,
            name: file.name,
            createdTime: file.createdTime,
            size,
          });
        }
      } catch (delErr) {
        console.warn(`Could not delete expired backup file ${file.name} (${file.id}):`, delErr);
      }
    } else {
      retainedFiles.push({
        id: file.id,
        name: file.name,
        createdTime: file.createdTime,
        size,
      });
    }
  }

  return { deletedFiles, retainedFiles };
}
