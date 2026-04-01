export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-10">
        <div className="h-8 bg-gray-300 rounded w-28 mb-2" />
        <div className="h-4 bg-gray-300 rounded w-56" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-gray-300 shrink-0" />
            <div className="space-y-2">
              <div className="h-6 bg-gray-300 rounded w-12" />
              <div className="h-3 bg-gray-300 rounded w-20" />
            </div>
          </div>
        ))}
      </div>

      {/* Media grid */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex justify-between mb-6">
          <div className="h-10 bg-gray-300 rounded-lg w-64" />
          <div className="h-10 bg-gray-300 rounded-full w-32" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 py-3">
              <div className="w-12 h-12 rounded-lg bg-gray-300 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-300 rounded w-1/3" />
                <div className="h-3 bg-gray-300 rounded w-1/4" />
              </div>
              <div className="w-16 h-4 bg-gray-300 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
