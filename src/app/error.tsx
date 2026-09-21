'use client';

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg p-8 text-center">
      <h2 className="text-xl font-semibold">This page could not be loaded</h2>
      <p className="mt-2 text-sm text-slate-600">
        The request failed. Your data was not changed. Try again, or go back and reload.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
      >
        Try again
      </button>
    </div>
  );
}
