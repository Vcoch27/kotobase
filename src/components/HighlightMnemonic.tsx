import React from "react";

interface HighlightMnemonicProps {
  text?: string | null;
  className?: string;
}

/**
 * Component hiển thị Mẹo nhớ (Mnemonic) với cơ chế Highlight thông minh:
 * 1. Từ viết hoa chữ cái đầu (VD: "Khăn", "Thực") => Thành phần cấu tạo / Bộ thủ của Kanji (màu Indigo/Xanh tím).
 * 2. Từ VIẾT HOA TOÀN BỘ (VD: "SỨC") => Nghĩa gốc của Kanji (màu Rose/Đỏ hồng nổi bật).
 * 3. Các từ thường và dấu câu => Hiển thị bình thường.
 */
export function HighlightMnemonic({ text, className = "" }: HighlightMnemonicProps) {
  if (!text) return null;

  // Tách văn bản thành các token gồm từ và ký tự phân cách
  // \p{L} nhận diện mọi ký tự chữ Unicode (hỗ trợ đầy đủ tiếng Việt có dấu)
  // \p{M} nhận diện các dấu thanh / nguyên âm kết hợp
  const tokens = text.split(/([\p{L}\p{M}]+)/gu);

  return (
    <span className={`inline leading-relaxed ${className}`}>
      {tokens.map((token, index) => {
        // Kiểm tra xem token có phải là từ chứa chữ cái hay không
        const isWord = /[\p{L}]/u.test(token);
        if (!isWord) {
          // Khoảng trắng, dấu câu (.,!?), dấu ngoặc... giữ nguyên
          return <React.Fragment key={index}>{token}</React.Fragment>;
        }

        const isAllUpper = token === token.toUpperCase() && token !== token.toLowerCase();
        const isTitleCase =
          !isAllUpper &&
          token[0] === token[0].toUpperCase() &&
          token.slice(1) === token.slice(1).toLowerCase();

        if (isAllUpper) {
          // VIẾT HOA TOÀN BỘ => Nghĩa gốc Kanji (Ví dụ: SỨC)
          return (
            <span
              key={index}
              title="Nghĩa gốc của Hán tự"
              className="inline-block px-1.5 py-0.5 mx-0.5 rounded-md font-extrabold text-rose-700 dark:text-rose-300 bg-rose-100/80 dark:bg-rose-500/20 border border-rose-300/80 dark:border-rose-500/30 shadow-xs tracking-wide align-baseline"
            >
              {token}
            </span>
          );
        }

        if (isTitleCase) {
          // Viết hoa chữ đầu => Thành phần / Bộ thủ cấu tạo Kanji (Ví dụ: Khăn, Thực)
          return (
            <span
              key={index}
              title="Thành phần / Bộ thủ cấu tạo Hán tự"
              className="inline-block px-1.5 py-0.5 mx-0.5 rounded-md font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 shadow-xs align-baseline"
            >
              {token}
            </span>
          );
        }

        // Từ viết thường bình thường
        return <React.Fragment key={index}>{token}</React.Fragment>;
      })}
    </span>
  );
}
