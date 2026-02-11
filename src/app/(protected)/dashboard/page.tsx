import { Card } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">Foundation Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          P-1 infrastructure is active: auth, protected shell, Supabase storage wiring, and EPUB upload validation.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-2">
          <h2 className="text-lg font-semibold">Auth + Route Protection</h2>
          <p className="text-sm text-muted-foreground">
            Access to `/dashboard` and `/upload` requires an authenticated Supabase session.
          </p>
        </Card>
        <Card className="space-y-2">
          <h2 className="text-lg font-semibold">Upload Guardrails</h2>
          <p className="text-sm text-muted-foreground">
            EPUB only, max 100 MB, with user-friendly validation and no stack trace leakage.
          </p>
        </Card>
      </div>
    </div>
  );
}
