export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-300 rounded w-32 mb-6" />

      {/* Student header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-full bg-gray-300" />
        <div className="space-y-2">
          <div className="h-6 bg-gray-300 rounded w-40" />
          <div className="h-4 bg-gray-300 rounded w-48" />
        </div>
        <div className="ml-auto h-5 bg-gray-300 rounded-full w-20" />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
            <div className="h-3 bg-gray-300 rounded w-16" />
            <div className="h-6 bg-gray-300 rounded w-24" />
          </div>
        ))}
      </div>

      {/* Answers table */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="h-6 bg-gray-300 rounded w-36 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 py-3">
              <div className="w-8 h-8 rounded-full bg-gray-300 shrink-0" />
              <div className="flex-1 h-4 bg-gray-300 rounded" />
              <div className="w-24 h-4 bg-gray-300 rounded" />
              <div className="w-24 h-4 bg-gray-300 rounded" />
              <div className="w-8 h-8 rounded-full bg-gray-300" />
            </div>
          ))}
        </div>
      </div>

      {/* Comments */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mt-6">
        <div className="h-6 bg-gray-300 rounded w-28 mb-4" />
        <div className="h-20 bg-gray-300 rounded-lg w-full" />
      </div>
    </div>
  );
}
