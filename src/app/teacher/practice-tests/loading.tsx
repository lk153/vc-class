export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-10">
        <div>
          <div className="h-8 bg-gray-300 rounded w-48 mb-2" />
          <div className="h-4 bg-gray-300 rounded w-80" />
        </div>
        <div className="h-11 bg-gray-300 rounded-full w-40" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-gray-300 shrink-0" />
            <div className="space-y-2">
              <div className="h-6 bg-gray-300 rounded w-10" />
              <div className="h-3 bg-gray-300 rounded w-20" />
            </div>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-gray-300" />
              <div className="h-5 bg-gray-300 rounded-full w-16" />
            </div>
            <div className="h-6 bg-gray-300 rounded w-3/4" />
            <div className="h-4 bg-gray-300 rounded w-1/2" />
            <div className="flex justify-between pt-4 border-t border-gray-100">
              <div className="h-4 bg-gray-300 rounded w-24" />
              <div className="h-4 bg-gray-300 rounded w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
