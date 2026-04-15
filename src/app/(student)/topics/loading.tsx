export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-300 rounded w-48 mb-2" />
      <div className="h-4 bg-gray-300 rounded w-80 mb-8" />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="h-40 bg-gray-300" />
            <div className="p-5 space-y-3">
              <div className="h-5 bg-gray-300 rounded w-3/4" />
              <div className="h-4 bg-gray-300 rounded w-full" />
              <div className="flex justify-between items-center pt-2">
                <div className="h-3 bg-gray-300 rounded w-20" />
                <div className="h-3 bg-gray-300 rounded w-12" />
              </div>
              <div className="h-2 bg-gray-300 rounded-full w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
