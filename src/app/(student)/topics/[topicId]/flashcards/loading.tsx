export default function Loading() {
  return (
    <div className="animate-pulse flex flex-col items-center justify-center min-h-[60vh]">
      <div className="h-5 bg-gray-300 rounded w-32 mb-6" />
      <div className="w-full max-w-md aspect-[3/4] bg-white rounded-2xl border border-gray-100 shadow-lg" />
      <div className="flex gap-4 mt-8">
        <div className="w-14 h-14 bg-gray-300 rounded-full" />
        <div className="w-14 h-14 bg-gray-300 rounded-full" />
      </div>
    </div>
  );
}
