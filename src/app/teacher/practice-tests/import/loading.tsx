export default function Loading() {
  return (
    <div className="animate-pulse max-w-3xl">
      <div className="h-4 bg-gray-300 rounded w-24 mb-6" />
      <div className="h-8 bg-gray-300 rounded w-56 mb-8" />

      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-6">
        <div className="space-y-2">
          <div className="h-4 bg-gray-300 rounded w-20" />
          <div className="h-10 bg-gray-300 rounded-lg w-full" />
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-300 rounded w-24" />
          <div className="h-10 bg-gray-300 rounded-lg w-full" />
        </div>
        <div className="border-2 border-dashed border-gray-200 rounded-xl h-40 flex items-center justify-center">
          <div className="h-5 bg-gray-300 rounded w-48" />
        </div>
        <div className="h-11 bg-gray-300 rounded-full w-full" />
      </div>
    </div>
  );
}
