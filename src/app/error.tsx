"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center">
        <span className="material-symbols-outlined text-5xl text-error mb-4 block">
          error
        </span>
        <h2 className="text-xl font-bold text-foreground mb-2">Something went wrong</h2>
        <p className="text-muted mb-6 text-sm">{error.message}</p>
        <button
          onClick={reset}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-lg text-sm font-medium transition"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
