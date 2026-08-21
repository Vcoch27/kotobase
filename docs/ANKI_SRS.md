# 🧠 Thuật Toán Ôn Tập Ngắt Quãng Anki SRS (SuperMemo SM-2)

Tài liệu này mô tả chi tiết cách thức triển khai thuật toán ôn tập ngắt quãng **SuperMemo SM-2 (Anki Spaced Repetition System)** trong ứng dụng **Kotobase**.

---

## 1. Nguyên Lý Hoạt Động Của Thuật Toán SM-2

Thuật toán SM-2 tối ưu hóa việc ghi nhớ từ vựng dựa trên đường cong lãng quên (Forgetting Curve) của Hermann Ebbinghaus:

Mỗi từ vựng được quản lý bởi 3 thông số toán học:
1. **$I$ (Interval - Khoảng cách ôn tập):** Số ngày cần chờ trước khi ôn lại từ này.
2. **$n$ (Repetition count - Số lần nhớ liên tiếp):** Số lần người học trả lời đúng liên tiếp.
3. **$EF$ (Ease Factor - Hệ số độ dễ):** Độ dễ của từ vựng (Giá trị ban đầu mặc định là $2.5$, tối thiểu là $1.3$).

---

## 2. Công Thức Tính Toán

Khi người học đánh giá một từ vựng sau khi lật Flashcard, người học chọn 1 trong 4 mức đánh giá ($q \in \{1, 2, 3, 4\}$ hoặc $q \in \{0, 3, 4, 5\}$):

### 2.1. Cập nhật Hệ Số Độ Dễ ($EF$):
$$EF' = EF + (0.1 - (5 - q) \times (0.08 + (5 - q) \times 0.02))$$
$$\text{Nếu } EF' < 1.3 \implies EF' = 1.3$$

### 2.2. Cập nhật Khoảng Cách Ôn Tập ($I$):
* **Nếu người học quên từ vựng ($q < 3$ / "Quên" hoặc "Lại"):**
  $$n = 0$$
  $$I = 1 \text{ ngày}$$
* **Nếu người học nhớ từ vựng ($q \ge 3$ / "Khó", "Tốt", "Dễ"):**
  * Lần nhớ thứ 1 ($n = 1$): $I_1 = 1 \text{ ngày}$
  * Lần nhớ thứ 2 ($n = 2$): $I_2 = 6 \text{ ngày}$
  * Lần nhớ thứ $n > 2$: $I_n = I_{n-1} \times EF'$

---

## 3. Lịch Ôn Tập Hàng Ngày (Due Cards Queue)

Khi người dùng mở chế độ **Flashcard** hoặc **Quiz**:
* Hệ thống lọc ra các từ vựng thỏa mãn điều kiện:
  $$\text{srsNextReview} \le \text{Thời điểm hiện tại (now)}$$
* Toàn bộ từ vựng cần ôn tập trong ngày được đưa vào hàng đợi ưu tiên (Queue) giúp người học chỉ tập trung vào những từ sắp bị quên, tiết kiệm tối đa thời gian học tập.
