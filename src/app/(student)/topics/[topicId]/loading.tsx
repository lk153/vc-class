export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* Breadcrumb */}
      <div className="h-4 bg-gray-300 rounded w-40 mb-6" />

      {/* Hero */}
      <div className="flex flex-col lg:flex-row gap-8 mb-12">
        <div className="flex-1">
          <div className="h-10 bg-gray-300 rounded w-3/4 mb-3" />
          <div className="h-5 bg-gray-300 rounded w-full mb-2" />
          <div className="h-5 bg-gray-300 rounded w-2/3" />
        </div>
        <div className="w-full lg:w-72 bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <div className="h-5 bg-gray-300 rounded w-32" />
          <div className="h-3 bg-gray-300 rounded-full w-full" />
          <div className="h-10 bg-gray-300 rounded-full w-full" />
        </div>
      </div>

      {/* Vocabulary grid */}
      <div className="h-6 bg-gray-300 rounded w-36 mb-4" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
            <div className="h-5 bg-gray-300 rounded w-2/3" />
            <div className="h-4 bg-gray-300 rounded w-full" />
            <div className="h-3 bg-gray-300 rounded w-1/2" />
          </div>
        ))}
      </div>

      {/* Practice tests */}
      <div className="h-6 bg-gray-300 rounded w-40 mb-4" />
      <div className="bg-white rounded-xl border border-gray-100 p-6 h-32" />
    </div>
  );
}
