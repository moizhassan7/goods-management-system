import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg p-8 text-center">
      <h2 className="text-xl font-semibold">Page not found</h2>
      <p className="mt-2 text-sm text-slate-600">That address does not exist in this application.</p>
      <Link href="/" className="mt-4 inline-block text-sm underline">
        Back to dashboard
      </Link>
    </div>
  );
}
