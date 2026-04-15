export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-10">
        <div className="h-8 bg-gray-300 rounded w-36 mb-2" />
        <div className="h-4 bg-gray-300 rounded w-64" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        {/* Search bar */}
        <div className="h-10 bg-gray-300 rounded-lg w-full max-w-sm mb-6" />
        {/* Student rows */}
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 py-3">
              <div className="w-10 h-10 rounded-full bg-gray-300 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-300 rounded w-1/3" />
                <div className="h-3 bg-gray-300 rounded w-1/4" />
              </div>
              <div className="h-5 bg-gray-300 rounded-full w-16" />
              <div className="h-5 bg-gray-300 rounded-full w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
