export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-10">
        <div className="h-8 bg-gray-300 rounded w-48 mb-2" />
        <div className="h-4 bg-gray-300 rounded w-64" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="h-10 bg-gray-300 rounded-lg w-64" />
          <div className="h-10 bg-gray-300 rounded-lg w-36" />
          <div className="h-10 bg-gray-300 rounded-lg w-36" />
        </div>
        {/* Table rows */}
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 py-3">
              <div className="w-9 h-9 rounded-full bg-gray-300 shrink-0" />
              <div className="flex-1 h-4 bg-gray-300 rounded" />
              <div className="w-20 h-4 bg-gray-300 rounded" />
              <div className="w-12 h-6 bg-gray-300 rounded-full" />
              <div className="w-16 h-4 bg-gray-300 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
