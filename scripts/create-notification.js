#!/usr/bin/env node
/**
 * Script tạo thông báo cập nhật KotoBase (System Notification Release)
 * Sử dụng:
 * 1. Không tham số (Hỏi đáp tương tác): npm run notify
 * 2. Truyền tham số: node scripts/create-notification.js --title "..." --summary "..." --content "..." --type "feature" --version "v2.5.0"
 */

const path = require("path");
const readline = require("readline");
const projectRoot = path.resolve(__dirname, "..");

// Load env từ Next.js
try {
  const { loadEnvConfig } = require("@next/env");
  loadEnvConfig(projectRoot);
} catch (e) {
  console.warn("Không thể load @next/env, kiểm tra biến môi trường hệ thống.");
}

const admin = require("firebase-admin");

function getAdminDb() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }
  return admin.firestore();
}

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith("--")) {
        result[key] = nextArg;
        i++;
      } else {
        result[key] = true;
      }
    }
  }
  return result;
}

function askQuestion(rl, query, defaultValue = "") {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

async function run() {
  console.log("==================================================================");
  console.log("      🔔  KOTOBASE SYSTEM NOTIFICATION CREATOR (RELEASE)          ");
  console.log("==================================================================");

  const args = parseArgs();
  let { title, summary, content, type, version, link, tag } = args;

  if (!title || !summary || !content) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log("\nNhập thông tin bản cập nhật mới (nhấn Enter để chọn mặc định):\n");

    if (!title) {
      title = await askQuestion(rl, "1. Tiêu đề thông báo (VD: Cập nhật giao diện Hán tự 2 cột): ");
      if (!title) {
        console.error("❌ Tiêu đề không được để trống!");
        rl.close();
        process.exit(1);
      }
    }

    if (!summary) {
      summary = await askQuestion(rl, "2. Tóm tắt ngắn gọn (1-2 câu hiển thị trên Toast trượt): ");
      if (!summary) {
        console.error("❌ Tóm tắt không được để trống!");
        rl.close();
        process.exit(1);
      }
    }

    if (!content) {
      content = await askQuestion(
        rl,
        "3. Nội dung chi tiết (hỗ trợ xuống dòng): ",
        summary
      );
    }

    if (!type) {
      console.log("\nChọn loại thông báo:");
      console.log("  1) feature      (✨ Tính năng mới - Mặc định)");
      console.log("  2) improvement  (⚡ Cải tiến)");
      console.log("  3) fix          (🛠️ Sửa lỗi)");
      console.log("  4) announcement (📢 Thông báo chung)");
      const typeChoice = await askQuestion(rl, "Nhập lựa chọn [1-4]: ", "1");
      const typeMap = {
        "1": "feature",
        "2": "improvement",
        "3": "fix",
        "4": "announcement",
      };
      type = typeMap[typeChoice] || "feature";
    }

    if (!version) {
      version = await askQuestion(rl, "4. Phiên bản (VD: v2.5.0 - bỏ trống nếu không cần): ", "");
    }

    if (!link) {
      link = await askQuestion(rl, "5. Link điều hướng (VD: /kanji hoặc bỏ trống): ", "");
    }

    rl.close();
  }

  const typeTagMap = {
    feature: "✨ Tính năng mới",
    improvement: "⚡ Cải tiến",
    fix: "🛠️ Sửa lỗi",
    announcement: "📢 Thông báo",
  };

  const finalTag = tag || typeTagMap[type] || "✨ Cập nhật mới";
  const now = new Date().toISOString();

  try {
    console.log("\n⏳ Đang kết nối Firestore và tạo thông báo...");
    const db = getAdminDb();
    const docRef = db.collection("system_notifications").doc();

    const payload = {
      id: docRef.id,
      title: title.trim(),
      summary: summary.trim(),
      content: content.trim(),
      type: type || "feature",
      tag: finalTag,
      version: version ? version.trim() : null,
      link: link ? link.trim() : null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(payload);

    console.log("==================================================================");
    console.log("✅ TẠO THÔNG BÁO THÀNH CÔNG!");
    console.log(`   ID:      ${docRef.id}`);
    console.log(`   Tiêu đề: ${payload.title}`);
    console.log(`   Loại:    ${payload.tag} (${payload.type})`);
    if (payload.version) console.log(`   Version: ${payload.version}`);
    console.log(`   Thời gian: ${payload.createdAt}`);
    console.log("==================================================================");
    console.log("💡 Khi người dùng truy cập web, thông báo sẽ tự động hiển thị!\n");
  } catch (error) {
    console.error("❌ Lỗi khi ghi Firestore:", error.message || error);
    process.exit(1);
  }
}

run();
