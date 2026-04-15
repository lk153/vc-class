export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-300 rounded w-24 mb-6" />
      <div className="h-8 bg-gray-300 rounded w-64 mb-2" />
      <div className="h-4 bg-gray-300 rounded w-40 mb-8" />

      {/* Questions */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="h-6 bg-gray-300 rounded w-32 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border border-gray-100 rounded-lg p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-300" />
                <div className="flex-1 h-5 bg-gray-300 rounded" />
                <div className="w-16 h-5 bg-gray-300 rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="h-9 bg-gray-300 rounded-lg" />
                <div className="h-9 bg-gray-300 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
