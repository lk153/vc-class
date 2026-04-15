export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-300 rounded w-24 mb-6" />
      <div className="h-8 bg-gray-300 rounded w-56 mb-2" />
      <div className="h-4 bg-gray-300 rounded w-80 mb-2" />
      <div className="h-5 bg-gray-300 rounded-full w-20 mb-8" />

      {/* Vocabulary list */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex justify-between mb-6">
          <div className="h-6 bg-gray-300 rounded w-32" />
          <div className="h-9 bg-gray-300 rounded-full w-28" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 py-3 border-b border-gray-50">
              <div className="w-8 h-8 rounded bg-gray-300 shrink-0" />
              <div className="flex-1 h-4 bg-gray-300 rounded" />
              <div className="w-24 h-4 bg-gray-300 rounded" />
              <div className="w-16 h-4 bg-gray-300 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
