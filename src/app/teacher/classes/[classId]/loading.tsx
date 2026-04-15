export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-300 rounded w-24 mb-6" />
      <div className="h-8 bg-gray-300 rounded w-64 mb-2" />
      <div className="h-4 bg-gray-300 rounded w-40 mb-8" />

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left - Form */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-gray-300 rounded w-24" />
              <div className="h-10 bg-gray-300 rounded-lg w-full" />
            </div>
          ))}
        </div>

        {/* Right - Lists */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="h-6 bg-gray-300 rounded w-40 mb-4" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <div className="w-8 h-8 rounded-full bg-gray-300" />
                <div className="flex-1 h-4 bg-gray-300 rounded" />
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="h-6 bg-gray-300 rounded w-40 mb-4" />
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <div className="w-8 h-8 rounded bg-gray-300" />
                <div className="flex-1 h-4 bg-gray-300 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
