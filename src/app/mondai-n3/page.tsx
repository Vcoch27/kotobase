import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { mondaiN3 } from "@/config/mondai-n3";

export const metadata: Metadata = {
  title: `${mondaiN3.title} | KotoBase`,
  description: "Luyện nghe JLPT N3 với audio gốc, bản dịch và flashcard cho Mondai 4 và 5.",
};

export default function MondaiN3Page() {
  return (
    <main className="flex h-dvh flex-col bg-slate-50 pb-[env(safe-area-inset-bottom)] dark:bg-slate-950">
      <header className="shrink-0 border-b border-slate-200 bg-white pt-[env(safe-area-inset-top)] dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5 sm:px-5">
          <Link
            href="/"
            aria-label="Quay về KotoBase"
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-300 dark:hover:bg-slate-800 sm:px-3"
          >
            <ArrowLeft size={17} aria-hidden="true" />
            <span className="hidden sm:inline">KotoBase</span>
          </Link>
          <h1 className="min-w-0 flex-1 text-sm font-bold text-slate-900 dark:text-slate-100 sm:text-base">
            {mondaiN3.title}
          </h1>
          <a
            href={mondaiN3.sourceUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Mở trang gốc trong tab mới"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300 dark:hover:bg-indigo-500/10 sm:px-3 sm:text-sm"
          >
            Mở trang gốc
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        </div>
      </header>

      <iframe
        src={mondaiN3.sourceUrl}
        title={mondaiN3.title}
        allow="autoplay"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        className="block min-h-0 w-full flex-1 border-0 bg-white"
      />
    </main>
  );
}
