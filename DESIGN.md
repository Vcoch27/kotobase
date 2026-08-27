# DESIGN.md — Hiến Pháp Thiết Kế KotoBase

> Tài liệu này là nguồn chân lý duy nhất (single source of truth) cho mọi quyết định thị giác trong dự án.
> **Không được** hardcode giá trị màu sắc, font, hay spacing trực tiếp — tất cả phải tham chiếu token bên dưới.

---

## 1. Triết Lý Cốt Lõi

- **Chủ đề**: Học thuật Nhật Bản — yên tĩnh, chính xác, tôn trọng chữ viết
- **Màu nhấn**: Amber/Vàng đồng (mực tàu, giấy washi)
- **Phong cách**: Elevation-based (không dùng viền 1px để phân chia), khoảng trắng rộng
- **Dark mode**: Nền xanh đậm pha lạnh (không bao giờ đen thuần `#000`)

---

## 2. Bảng Màu (Color Tokens — OKLCH)

### Light Mode
| Token | OKLCH | Mô tả |
|---|---|---|
| `--color-bg` | `oklch(97% 0.005 250)` | Nền trang — trắng lạnh nhẹ |
| `--color-surface` | `oklch(100% 0 0)` | Nền card, panel |
| `--color-surface-raised` | `oklch(95% 0.005 250)` | Nền card hover |
| `--color-border` | `oklch(88% 0.008 250)` | Viền tham chiếu (dùng hạn chế) |
| `--color-text-primary` | `oklch(15% 0.01 250)` | Văn bản chính |
| `--color-text-muted` | `oklch(50% 0.012 250)` | Văn bản phụ (tỉ lệ ≥ 4.5:1) |
| `--color-primary` | `oklch(52% 0.16 250)` | Màu chủ đạo (xanh dương trầm) |
| `--color-accent` | `oklch(72% 0.18 55)` | Màu nhấn Amber |
| `--color-accent-muted` | `oklch(95% 0.06 55)` | Nền nhạt của accent |
| `--color-danger` | `oklch(55% 0.22 25)` | Màu lỗi/nguy hiểm |
| `--color-success` | `oklch(60% 0.18 145)` | Màu thành công |
| `--ring` | `oklch(72% 0.18 55)` | Focus ring (Amber) |

### Dark Mode (`.dark`)
| Token | OKLCH | Mô tả |
|---|---|---|
| `--color-bg` | `oklch(14% 0.01 250)` | Nền trang — xanh đậm pha lạnh |
| `--color-surface` | `oklch(18% 0.012 250)` | Nền card, panel |
| `--color-surface-raised` | `oklch(22% 0.012 250)` | Nền card hover |
| `--color-border` | `oklch(28% 0.012 250)` | Viền tham chiếu |
| `--color-text-primary` | `oklch(94% 0.008 250)` | Văn bản chính (không trắng thuần) |
| `--color-text-muted` | `oklch(65% 0.012 250)` | Văn bản phụ (tỉ lệ ≥ 4.5:1) |
| `--color-primary` | `oklch(65% 0.16 250)` | Màu chủ đạo sáng hơn ở dark |
| `--color-accent` | `oklch(78% 0.18 55)` | Màu nhấn Amber sáng hơn |
| `--color-accent-muted` | `oklch(22% 0.06 55)` | Nền nhạt accent (dark) |
| `--ring` | `oklch(78% 0.18 55)` | Focus ring (Amber sáng) |

---

## 3. Hệ Thống Kiểu Chữ (Typography Scale × 1.25)

| Level | Size | Font | Weight | Dùng cho |
|---|---|---|---|---|
| `text-display` | 39px / 2.44rem | `Noto Serif JP` | 700 | Tiêu đề lớn, Kanji nổi bật |
| `text-heading-1` | 31px / 1.94rem | `Noto Serif JP` | 700 | H1 section |
| `text-heading-2` | 25px / 1.56rem | `Geist` | 600 | H2 section |
| `text-heading-3` | 20px / 1.25rem | `Geist` | 600 | H3, card title |
| `text-body-lg` | 18px / 1.125rem | `Geist` | 400 | Body text lớn |
| `text-body` | 16px / 1rem | `Geist` | 400 | Body text chuẩn (minimum) |
| `text-body-sm` | 14px / 0.875rem | `Geist` | 400 | Labels, metadata |
| `text-caption` | 12px / 0.75rem | `Geist` | 500 | Badges, captions |

**Quy tắc**:
- `font-display` (Noto Serif JP): Chỉ dùng cho Kanji, tiêu đề app brand, hero text
- `font-body` (Geist): Tất cả UI text còn lại
- `line-height`: heading = 1.2, body = 1.6
- `measure` (max-width một dòng): 60-75 ký tự (`max-w-prose`)

---

## 4. Hệ Thống Lưới 8pt (Spacing)

Tất cả khoảng cách phải là bội số của 8px (hoặc 4px cho micro-spacing).

---

## 5. Hệ Thống Elevation (Không Dùng Viền)

> TUYET DOI KHONG dung `border border-slate-200 dark:border-slate-800` de phan chia card/panel.
> Su dung chenh lech mau nen + shadow de tao chieu sau.

| Level | Class | Dùng cho |
|---|---|---|
| `elevation-0` | (nền khác bg) | Sidebar, panel phụ |
| `elevation-sm` | `shadow-elevation-sm` | Card từ vựng, input |
| `elevation-md` | `shadow-elevation-md` | Dropdown, modal backdrop |
| `elevation-lg` | `shadow-elevation-lg` | Modal, dialog |

---

## 6. Quy Tắc Bo Góc

| Giá trị | Token | Dùng cho |
|---|---|---|
| `4px` | `rounded` | Badge, tag nhỏ |
| `8px` | `rounded-lg` | Input, button nhỏ |
| `12px` | `rounded-xl` | Card, button lớn |
| `16px` | `rounded-2xl` | Modal, panel lớn |
| `9999px` | `rounded-full` | Avatar, pill badge |

---

## 7. Quy Tắc Icon (Lucide React)

| Ngữ cảnh | Size | Stroke Width |
|---|---|---|
| Trong nút bấm | `w-4 h-4` | `1.5` |
| Inline với text body | `w-4 h-4` | `1.5` |
| Standalone indicator | `w-5 h-5` | `1.5` |
| Empty state illustration | `w-12 h-12` | `1` |
| KHONG dung icon lon w-8+ ngay tren tieu de H1 | — | — |

---

## 8. Quy Tắc Animation

| Loại | Easing | Duration |
|---|---|---|
| Fade in/out | `cubic-bezier(0.16, 1, 0.3, 1)` | 200ms |
| Slide up modal | `cubic-bezier(0.16, 1, 0.3, 1)` | 280ms |
| Spring (tab indicator) | `type: "spring", bounce: 0.2` | 500ms |
| Hover transform | `ease-out` | 150ms |
| Luon ton trong `prefers-reduced-motion` | — | — |

---

## 9. Focus Ring

Tat ca element tuong tac phai co `focus-visible:ring-2 focus-visible:ring-[--ring] focus-visible:ring-offset-2`.
Token `--ring` = Amber.
