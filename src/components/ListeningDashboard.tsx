"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronDown, Clock3, ExternalLink, Headphones, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { AppLogo } from "./AppLogo";
import { ListeningPlayer } from "./ListeningPlayer";
import { listeningExams, listeningWeeks, DRIVE_FOLDER_URL, reservedExams, usedExams } from "@/lib/listening-plan";

const panel = "rounded-2xl bg-surface shadow-elevation-sm";
const button = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-body-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

export function ListeningDashboard() {
  const [weekIndex, setWeekIndex] = useState(0);
  const [dayIndex, setDayIndex] = useState(0);
  const [tab, setTab] = useState<"plan" | "method" | "library">("plan");
  const [playing, setPlaying] = useState<string | null>(null);
  const [libraryExam, setLibraryExam] = useState<string | null>(null);
  const libraryPlayer = useRef<HTMLDivElement>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const week = listeningWeeks[weekIndex];
  const day = week.days[dayIndex];
  const activeExam = libraryExam || day.exam;
  const exam = listeningExams.find(item => item.label === activeExam)!;

  useEffect(() => {
    if (libraryExam) libraryPlayer.current?.scrollIntoView({ block: "start" });
  }, [libraryExam]);

  function selectDay(w: number, d: number) {
    setWeekIndex(w); setDayIndex(d); setLibraryExam(null); setPlaying(null);
  }

  return <div className="listening-page min-h-screen bg-bg text-text-primary pb-28 md:pb-12">
    <header className="bg-surface shadow-elevation-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-8">
        <Link href="/" className="flex items-center gap-3 rounded-lg focus-visible:ring-2"><AppLogo size="sm" /><span className="font-display text-heading-3 font-bold">KotoBase</span></Link>
        <div className="flex items-center gap-2">
          <Link href="/" aria-label="Về kho từ vựng" className={`${button} text-text-muted`}><ArrowLeft size={16} /><span className="hidden sm:inline">Kho từ vựng</span></Link>
          <button className={`${button} bg-surface-raised`} aria-label="Đổi giao diện sáng / tối" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}><Sun className="hidden dark:block" size={18} /><Moon className="dark:hidden" size={18} /></button>
        </div>
      </div>
    </header>

    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-8">
      <section className="grid items-end gap-6 lg:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <p className="flex items-center gap-2 text-body-sm font-semibold text-primary"><Headphones size={18} /> NGHE HIỂU N3 <span className="text-text-muted">/</span> CHẶNG 7 TUẦN</p>
          <h1 className="text-heading-1 font-bold md:text-display">Nghe đều. Hiểu sâu.<br /><span className="text-primary">Vững từng câu.</span></h1>
          <p className="max-w-prose text-body text-text-muted">49 buổi học từ bộ đề của bạn. Mỗi ngày một việc rõ ràng, có buổi ôn và đề kiểm tra riêng để hướng tới điểm nghe cao trong kỳ thi tháng 12.</p>
        </div>
        <div className="flex flex-wrap gap-2 lg:flex-col">
          <a href={DRIVE_FOLDER_URL} target="_blank" rel="noreferrer" className={`${button} bg-surface shadow-elevation-sm`}><ExternalLink size={16} />Google Drive · 26 đề</a>
        </div>
      </section>

      <div className={`${panel} grid gap-4 p-4 sm:grid-cols-3 md:p-6`}>
        {[["20–30 phút", "Buổi thường · khi bận: 10 phút"], ["Nghe → chữa → ôn", "Lặp đoạn khó, trở lại sau 1 · 3 · 7 buổi"], ["Không gắn ngày tháng", "Học theo thứ tự, quản lý ở sheet riêng"]].map(([title, subtitle]) => <div key={title}><p className="font-semibold text-body">{title}</p><p className="mt-1 text-body-sm text-text-muted">{subtitle}</p></div>)}
      </div>

      <nav aria-label="Nội dung luyện nghe" className="flex flex-wrap gap-2">
        {([["plan", "Lộ trình từng ngày"], ["method", "Cách luyện cho hiệu quả"], ["library", "Kho 26 đề"]] as const).map(([value, label]) => <button key={value} aria-pressed={tab === value} onClick={() => { setTab(value); setPlaying(null); setLibraryExam(null); }} className={`${button} ${tab === value ? "bg-primary text-surface" : "bg-surface text-text-muted hover:bg-surface-raised"}`}>{label}</button>)}
      </nav>

      {tab === "plan" && <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className={`${panel} min-w-0 p-4`} aria-label="Chọn tuần">
          <p className="mb-4 px-2 text-body-sm font-semibold text-text-muted">7 TUẦN · 49 BUỔI</p>
          <div className="flex gap-2 overflow-x-auto p-1 lg:grid lg:grid-cols-1">
            {listeningWeeks.map((item, index) => <button key={item.title} onClick={() => selectDay(index, 0)} aria-pressed={weekIndex === index} className={`w-48 shrink-0 rounded-xl p-3 text-left focus-visible:outline-none focus-visible:ring-2 lg:w-auto ${weekIndex === index ? "bg-accent-muted" : "hover:bg-surface-raised"}`}>
              <span className="block text-caption font-bold text-primary">TUẦN {index + 1}</span><span className="mt-1 block text-body-sm font-semibold">{item.title}</span>
            </button>)}
          </div>
          <p className="mt-4 px-2 text-body-sm text-text-muted">“Ngày” là thứ tự buổi học. Lỡ một ngày, tiếp tục buổi đang dở; không cần học bù gấp đôi.</p>
        </aside>

        <div className="min-w-0 space-y-6">
          <section className={`${panel} p-4 md:p-6`}>
            <p className="mb-2 text-body-sm font-semibold text-primary">Tuần {weekIndex + 1}</p>
            <h2 className="text-heading-2 font-bold">{week.title}</h2>
            <p className="mt-3 text-body text-text-muted">{week.focus}</p>
            <div className="mt-6 grid gap-2" aria-label="Chọn buổi học">
              {week.days.map((item, index) => <button key={index} onClick={() => selectDay(weekIndex, index)} aria-pressed={dayIndex === index} className={`grid grid-cols-[3rem_minmax(0,1fr)_1rem] items-center gap-x-3 gap-y-1 rounded-xl p-3 text-left focus-visible:outline-none focus-visible:ring-2 sm:grid-cols-[4rem_minmax(0,1fr)_auto_1rem] ${dayIndex === index ? "bg-accent-muted" : "bg-bg hover:bg-surface-raised"}`}>
                <span className="text-body-sm font-bold">Ngày {index + 1}</span>
                <span className="min-w-0 text-body-sm font-medium">{item.title}</span>
                <span className="col-start-2 text-caption text-text-muted sm:col-start-3">{item.exam} · {item.duration}</span>
                <ChevronDown size={16} className={`col-start-3 row-start-1 sm:col-start-4 ${dayIndex === index ? "text-primary" : "-rotate-90 text-text-muted"}`} />
              </button>)}
            </div>
          </section>

          <section className={`${panel} space-y-6 p-4 md:p-6`} aria-label={`Chi tiết tuần ${weekIndex + 1} ngày ${dayIndex + 1}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><p className="mb-2 text-body-sm font-semibold text-primary">TUẦN {weekIndex + 1} / NGÀY {dayIndex + 1}</p><h2 className="text-heading-2 font-bold">{day.title}</h2></div>
              <span className="flex items-center gap-2 rounded-full bg-surface-raised px-3 py-2 text-body-sm"><Clock3 size={16} />{day.duration}</span>
            </div>
            <ol className="space-y-4">
              {day.tasks.map((task, index) => <li key={task} className="flex gap-3 text-body leading-relaxed"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-muted text-body-sm font-bold">{index + 1}</span><span>{task}</span></li>)}
            </ol>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-bg p-4"><h3 className="font-body font-bold">Hôm nay bận?</h3><p className="mt-2 text-body-sm text-text-muted">{day.minimum}</p></div>
              <div className="rounded-xl bg-accent-muted p-4"><h3 className="font-body font-bold">Xong buổi này khi…</h3><p className="mt-2 text-body-sm">{day.outcome}</p></div>
            </div>
            <div className="space-y-4 rounded-xl bg-bg p-4">
              <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-semibold">Đề N3 {day.exam}</p><p className="mt-1 text-body-sm text-text-muted">{day.mock ? "Làm lần đầu không dùng lặp A–B. Chỉ lặp khi chữa bài." : "Đặt đoạn A–B quanh câu khó để nghe kỹ."}</p></div><button className={`${button} bg-accent-muted`} onClick={() => setPlaying(playing ? null : day.exam)}>{playing ? "Đóng trình nghe" : "Mở bài nghe"}<Headphones size={16} /></button></div>
              {playing && <ListeningPlayer key={exam.driveFileId} driveFileId={exam.driveFileId} label={exam.label} />}
            </div>
            <div className="flex justify-between gap-4">
              <button disabled={weekIndex === 0 && dayIndex === 0} className={`${button} bg-surface-raised disabled:opacity-40`} onClick={() => dayIndex > 0 ? selectDay(weekIndex, dayIndex - 1) : selectDay(weekIndex - 1, 6)}><ArrowLeft size={16} />Buổi trước</button>
              <button disabled={weekIndex === 6 && dayIndex === 6} className={`${button} bg-accent-muted disabled:opacity-40`} onClick={() => dayIndex < 6 ? selectDay(weekIndex, dayIndex + 1) : selectDay(weekIndex + 1, 0)}>Buổi tiếp theo<ArrowRight size={16} /></button>
            </div>
          </section>
        </div>
      </div>}

      {tab === "method" && <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className={`${panel} space-y-4 p-6`}><p className="text-body-sm font-semibold text-primary">01 / MỘT CÂU, NHIỀU LỚP</p><h2 className="text-heading-2 font-bold">Lặp có nhiệm vụ</h2>
          <ol className="list-decimal space-y-3 pl-5 text-body">
            <li><strong>Nghe mù ở 1×.</strong> Chốt đáp án, đánh dấu câu đoán. Không xem đáp án trước.</li>
            <li><strong>Tách chỗ không nghe ra.</strong> Lặp đoạn 5–20 giây khoảng 2–4 lượt; chép 1–2 câu chứa thông tin quyết định.</li>
            <li><strong>Chữa nguyên nhân.</strong> Thiếu từ, không nhận ra âm, cấu trúc hay bẫy đổi ý? Tra sau khi tự nghe. Có transcript thì đối chiếu; không có thì đánh dấu chỗ chưa chắc, không tự coi bản chép là đáp án.</li>
            <li><strong>Nhại theo rồi nghe lại.</strong> Nhại 3 lượt, cuối cùng đóng chữ, trở về 1× và nói lại ý chính. Có thể giảm tốc tạm thời bằng nút tốc độ bên dưới video.</li>
            <li><strong>Ôn sau 1, 3, 7 buổi.</strong> Chọn câu từ sheet để nghe ngẫu nhiên. Giải thích được bằng chứng mới tính là vững.</li>
          </ol><p className="rounded-xl bg-accent-muted p-4 text-body-sm">Không cần “cày nát” cả 26 đề trong 7 tuần. Chữa sâu một nhóm đề, giữ đề mới để đo thực lực. Nghe nền là phần thêm, không thay cho buổi nghe chủ động.</p>
        </section>
        <section className={`${panel} space-y-4 p-6`}><p className="text-body-sm font-semibold text-primary">02 / NGHE ĐÚNG THỨ CẦN TÌM</p><h2 className="text-heading-2 font-bold">Năm dạng nghe N3</h2>
          {[["1 · 課題理解", "Xác định việc cần làm tiếp theo, người thực hiện và điều kiện cuối cùng."], ["2 · ポイント理解", "Đọc câu hỏi trước; tập trung thông tin cần lấy như lý do, thời gian, lựa chọn."], ["3 · 概要理解", "Nắm chủ đề, mục đích và ý chính toàn đoạn; đừng mắc kẹt ở một từ lạ."], ["4 · 発話表現", "Dựa vào hình và tình huống, chọn cách nói hợp vai và quan hệ."], ["5 · 即時応答", "Nghe ý định và sắc thái; chọn lời đáp tự nhiên thay vì chỉ khớp từ."]].map(([title, text]) => <div key={title}><h3 className="font-body text-body font-bold">{title}</h3><p className="mt-1 text-body-sm text-text-muted">{text}</p></div>)}
          <a className="inline-block rounded-lg text-body-sm text-primary underline focus-visible:ring-2" href="https://www.jlpt.jp/e/guideline/testsections.html" target="_blank" rel="noreferrer">Cấu trúc bài thi · JLPT chính thức</a>
        </section>
        <section className={`${panel} space-y-4 p-6`}><p className="text-body-sm font-semibold text-primary">03 / ĐO TIẾN BỘ THẬT</p><h2 className="text-heading-2 font-bold">Giữ ba đề chưa nghe</h2>
          <p className="text-body">Dành 07/2024, 12/2024 và 07/2025 cho tuần 6–7. Nếu đã thuộc một đề, thay bằng đề dự phòng chưa nghe. Đề đã luyện chỉ đo độ vững, không dùng làm bằng chứng tăng điểm.</p>
          <p className="text-body">Mốc luyện tập đề xuất: ≥80% đúng lần đầu trên ít nhất 2 đề mới, làm liên tục ở 1×. Dưới 70%: kéo dài giai đoạn chữa lỗi; 70–79%: tiếp tục nghe kỹ và ôn cách quãng.</p>
          <p className="text-body-sm text-text-muted">Đây là tiêu chí tự học, không bảo đảm điểm thi. JLPT sử dụng điểm quy đổi; 80% đúng không đồng nghĩa 48/60 điểm.</p>
          <a className="inline-block rounded-lg text-body-sm text-primary underline focus-visible:ring-2" href="https://www.jlpt.jp/e/faq/" target="_blank" rel="noreferrer">Cách tính điểm · JLPT chính thức</a>
        </section>
        <section className={`${panel} space-y-4 p-6`}><p className="text-body-sm font-semibold text-primary">04 / GIỮ NHỊP ĐẾN THÁNG 12</p><h2 className="text-heading-2 font-bold">Một kế hoạch vừa sức</h2>
          <p className="text-body">Buổi thường 20–30 phút; bận thì 10 phút cho một câu. Buổi thi thử cần 35–45 phút liền mạch. Chưa xong nội dung thì tiếp tục ở buổi kế, nên chặng 49 buổi có thể kéo dài hơn 7 tuần.</p>
          <p className="text-body">Sau chặng này, mỗi tuần dùng 1 đề dự phòng chưa nghe, 4 buổi chữa và 2 buổi ôn nhẹ. Khi hết đề mới, tìm thêm bài chưa học để kiểm tra; không dùng điểm đề thuộc làm điểm chuẩn.</p>
          <div className="rounded-xl bg-bg p-4 text-body-sm"><strong>Sheet riêng nên ghi:</strong> tuần/ngày · đề · dạng/câu · mốc A–B · đúng lần đầu? · lỗi gì? · bằng chứng nghe được · ôn +1/+3/+7 · kết quả nghe lại.</div>
          <p className="text-body-sm text-text-muted">Bạn quản lý tiến độ trong sheet riêng; lộ trình không gán ngày tháng.</p>
        </section>
      </div>}

      {tab === "library" && <section className={`${panel} space-y-6 p-4 md:p-6`}>
        <div><h2 className="text-heading-2 font-bold">Bộ đề của bạn</h2><p className="mt-3 max-w-prose text-body text-text-muted">26 file nghe trong thư mục Google Drive của bạn, sắp theo kỳ thi. Các đề ngoài lộ trình được giữ làm dự phòng cho vòng tiếp theo.</p></div>
        {libraryExam && <div ref={libraryPlayer} className="scroll-mt-4 space-y-4 rounded-xl bg-bg p-4"><div className="flex items-center justify-between gap-4"><h3 className="text-heading-3">Đề {libraryExam}</h3><button className={`${button} bg-surface`} onClick={() => { setLibraryExam(null); setPlaying(null); }}>Đóng</button></div><ListeningPlayer key={exam.driveFileId} driveFileId={exam.driveFileId} label={exam.label} /></div>}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {listeningExams.map(item => <div key={item.driveFileId} className="flex flex-col items-start gap-3 rounded-xl bg-bg p-4">
            <div className="flex w-full items-center justify-between gap-2"><span className="text-caption text-text-muted">#{String(item.index).padStart(2, "0")} / GOOGLE DRIVE</span><span className="rounded-full bg-surface px-2 py-1 text-caption">{reservedExams.includes(item.label) ? "Để dành thi thử" : usedExams.has(item.label) ? "Trong lộ trình" : "Dự phòng"}</span></div>
            <h3 className="text-heading-3 font-bold">N3 · {item.label}</h3>
            {reservedExams.includes(item.label) && <p className="text-body-sm text-text-muted">Giữ chưa nghe đến buổi thi thử tuần 6–7.</p>}
            <button className={`${button} mt-auto bg-surface shadow-elevation-sm`} onClick={() => { setLibraryExam(item.label); setPlaying(item.label); }}><Headphones size={16} />{reservedExams.includes(item.label) ? "Chủ động mở đề dự trữ" : "Nghe đề này"}</button>
          </div>)}
        </div>
      </section>}
      <footer className="text-body-sm text-text-muted">Nguồn nghe: thư mục Google Drive của bạn. Cần kết nối mạng; nếu video không tải được, dùng chế độ xem Drive hoặc mở file trong tab mới.</footer>
    </main>
  </div>;
}
