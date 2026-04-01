export default function Loading() {
  return (
    <div className="animate-pulse flex flex-col items-center justify-center min-h-[60vh]">
      <div className="h-4 bg-gray-300 rounded w-24 mb-4" />
      <div className="h-8 bg-gray-300 rounded w-48 mb-10" />
      <div className="w-full max-w-2xl bg-white rounded-2xl border border-gray-100 p-8 space-y-6">
        <div className="h-6 bg-gray-300 rounded w-3/4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-gray-300 rounded-xl w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
