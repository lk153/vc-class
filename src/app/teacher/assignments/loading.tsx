export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-10">
        <div className="h-8 bg-gray-300 rounded w-44 mb-2" />
        <div className="h-4 bg-gray-300 rounded w-72" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Topics panel */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="h-6 bg-gray-300 rounded w-24 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <div className="w-5 h-5 rounded bg-gray-300" />
                <div className="flex-1 h-4 bg-gray-300 rounded" />
                <div className="w-12 h-4 bg-gray-300 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Classes panel */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="h-6 bg-gray-300 rounded w-24 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <div className="w-5 h-5 rounded bg-gray-300" />
                <div className="flex-1 h-4 bg-gray-300 rounded" />
                <div className="w-12 h-4 bg-gray-300 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
