#!/usr/bin/env node
/**
 * Manual Backup Runner for KotoBase
 * Invoked via: npm run backup
 */

const path = require("path");
const projectRoot = path.resolve(__dirname, "..");

// Load environment variables via Next.js env loader
try {
  const { loadEnvConfig } = require("@next/env");
  loadEnvConfig(projectRoot);
} catch (e) {
  // Fallback to manual dotenv loading if needed
  require("dotenv").config({ path: path.join(projectRoot, ".env") });
}

// Initialize jiti to execute TypeScript backup service with module aliases & full interop
const jiti = require("jiti")(projectRoot);
const { runFirestoreBackup } = jiti("./src/lib/backup/backup-service");

async function main() {
  console.log("==================================================================");
  console.log("             KOTOBASE CLOUD FIRESTORE BACKUP SYSTEM               ");
  console.log("==================================================================");

  const stepLabels = {
    init: " [INIT]       ",
    discovery: " [DISCOVERY]  ",
    export: " [READ]       ",
    compress: " [COMPRESS]   ",
    drive_auth: " [DRIVE-AUTH] ",
    drive_folder: " [DRIVE-DIR]  ",
    drive_upload: " [UPLOAD]     ",
    drive_verify: " [VERIFY]     ",
    retention: " [RETENTION]  ",
    complete: " [COMPLETED]  ",
  };

  try {
    const result = await runFirestoreBackup({
      onProgress: (step, msg) => {
        const prefix = stepLabels[step] || " [PROGRESS]  ";
        console.log(`${prefix} ${msg}`);
      },
    });

    console.log("------------------------------------------------------------------");
    console.log("                      BACKUP SUMMARY REPORT                       ");
    console.log("------------------------------------------------------------------");
    console.log(`Database:        ${result.databaseType}`);
    console.log(`Project ID:      ${result.projectId}`);
    console.log(`Backup File:     ${result.fileName}`);
    console.log(`Created At:      ${result.createdAt} (${result.timezone})`);
    console.log(`Collections:     ${result.totalCollections}`);
    console.log(`Total Documents: ${result.totalDocuments}`);
    console.log("Collections breakdown:");
    for (const col of result.collections) {
      console.log(`  - ${col.name.padEnd(20)}: ${col.documentCount} documents`);
    }
    console.log(`Raw JSON Size:   ${(result.rawSizeBytes / 1024).toFixed(2)} KB`);
    console.log(`Gzip File Size:  ${(result.compressedSizeBytes / 1024).toFixed(2)} KB (${result.compressionRatio} reduction)`);
    console.log(`Drive Folder:    ${result.drive.folderName} (ID: ${result.drive.folderId})`);
    console.log(`Drive File ID:   ${result.drive.fileId}`);
    console.log(`Retention Clean: ${result.retention.deletedFiles.length} deleted, ${result.retention.retainedFiles.length} retained`);
    console.log(`Execution Time:  ${(result.durationMs / 1000).toFixed(2)}s`);
    console.log("==================================================================");
    console.log(">>> BACKUP COMPLETED SUCCESSFULLY. NO DATA WAS MODIFIED OR RESTORED. <<<");
    process.exit(0);
  } catch (error) {
    console.error("==================================================================");
    console.error(">>> BACKUP FAILED WITH ERROR: <<<");
    console.error(error && error.message ? error.message : error);
    console.error("==================================================================");
    process.exit(1);
  }
}

main();
