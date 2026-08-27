// Skeleton Loading Screen — khớp hình dạng layout Dashboard
// Thay thế spinner vô hồn bằng skeleton có cấu trúc
export default function Loading() {
  return (
    <div className="min-h-screen bg-[oklch(var(--color-bg))] flex flex-col">
      {/* Skeleton Header */}
      <div className="sticky top-0 z-40 h-16 bg-[oklch(var(--color-surface))] shadow-elevation-sm">
        <div className="max-w-screen-2xl mx-auto px-4 lg:px-6 h-full flex items-center justify-between gap-4">
          {/* Logo skeleton */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl animate-shimmer" />
            <div className="w-28 h-5 rounded-lg animate-shimmer" />
          </div>

          {/* Search skeleton */}
          <div className="flex-1 max-w-xl hidden md:block px-8">
            <div className="w-full h-9 rounded-xl animate-shimmer" />
          </div>

          {/* Actions skeleton */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl animate-shimmer" />
            <div className="w-9 h-9 rounded-xl animate-shimmer" />
            <div className="w-24 h-8 rounded-xl animate-shimmer" />
          </div>
        </div>
      </div>

      {/* Skeleton Body */}
      <div className="flex flex-1 max-w-screen-2xl mx-auto w-full px-4 lg:px-6 py-6 gap-6">
        {/* Sidebar skeleton */}
        <aside className="hidden lg:flex flex-col gap-3 w-56 shrink-0">
          <div className="w-32 h-4 rounded animate-shimmer" />
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-2 py-2"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="w-4 h-4 rounded animate-shimmer" />
              <div
                className="h-4 rounded animate-shimmer"
                style={{ width: `${60 + Math.random() * 60}px` }}
              />
            </div>
          ))}
        </aside>

        {/* Main content skeleton */}
        <main className="flex-1 flex flex-col gap-4">
          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-xl animate-shimmer"
                style={{ animationDelay: `${i * 60}ms` }}
              />
            ))}
          </div>

          {/* Vocab cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-2">
            {[...Array(9)].map((_, i) => (
              <div
                key={i}
                className="h-28 rounded-xl animate-shimmer"
                style={{ animationDelay: `${i * 40}ms` }}
              />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
