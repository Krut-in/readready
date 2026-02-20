"use client";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ProtectedError({ error, reset }: ErrorProps) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <h2 className="text-base font-semibold text-destructive">Something went wrong</h2>
        {error.digest && (
          <p className="mt-1 text-xs text-muted-foreground">Reference: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="mt-4 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
