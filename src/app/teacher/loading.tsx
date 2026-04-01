export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="mb-10">
        <div className="h-8 bg-gray-300 rounded w-48 mb-2" />
        <div className="h-4 bg-gray-300 rounded w-64" />
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-3 mb-10">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-gray-300 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-6 bg-gray-300 rounded w-12" />
              <div className="h-3 bg-gray-300 rounded w-20" />
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="h-6 bg-gray-300 rounded w-40 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-full bg-gray-300 shrink-0" />
              <div className="flex-1 h-4 bg-gray-300 rounded" />
              <div className="w-16 h-4 bg-gray-300 rounded" />
              <div className="w-12 h-4 bg-gray-300 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
