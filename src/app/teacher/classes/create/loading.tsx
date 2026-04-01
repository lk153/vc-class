export default function Loading() {
  return (
    <div className="animate-pulse max-w-2xl">
      <div className="h-4 bg-gray-300 rounded w-24 mb-6" />
      <div className="h-8 bg-gray-300 rounded w-48 mb-8" />

      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-6">
        {/* Name */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-300 rounded w-24" />
          <div className="h-10 bg-gray-300 rounded-lg w-full" />
        </div>
        {/* Language + Level */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="h-4 bg-gray-300 rounded w-20" />
            <div className="h-10 bg-gray-300 rounded-lg w-full" />
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-300 rounded w-16" />
            <div className="h-10 bg-gray-300 rounded-lg w-full" />
          </div>
        </div>
        {/* Sessions */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-300 rounded w-28" />
          <div className="h-24 bg-gray-300 rounded-lg w-full" />
        </div>
        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="h-4 bg-gray-300 rounded w-20" />
            <div className="h-10 bg-gray-300 rounded-lg w-full" />
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-300 rounded w-20" />
            <div className="h-10 bg-gray-300 rounded-lg w-full" />
          </div>
        </div>
        {/* Submit */}
        <div className="h-11 bg-gray-300 rounded-full w-full" />
      </div>
    </div>
  );
}
