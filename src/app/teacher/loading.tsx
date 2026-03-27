export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 bg-gray-200 rounded w-48" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-5 h-20" />
        ))}
      </div>
      <div className="bg-card rounded-xl border border-border p-6 h-64" />
    </div>
  );
}
