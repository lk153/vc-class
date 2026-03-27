import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center">
        <span className="material-symbols-outlined text-5xl text-muted mb-4 block">
          search_off
        </span>
        <h2 className="text-xl font-bold text-foreground mb-2">Page not found</h2>
        <p className="text-muted mb-6 text-sm">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link
          href="/"
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-lg text-sm font-medium transition"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
