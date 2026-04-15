export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-10">
        <div className="h-8 bg-gray-300 rounded w-36 mb-2" />
        <div className="h-4 bg-gray-300 rounded w-64" />
      </div>

      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-gray-300 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-gray-300 rounded w-1/3" />
              <div className="h-3 bg-gray-300 rounded w-1/2" />
            </div>
            <div className="h-5 bg-gray-300 rounded-full w-16" />
            <div className="h-5 bg-gray-300 rounded-full w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
