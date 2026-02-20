"use client";

import { useState, useRef } from "react";
import { Upload, AlertTriangle, Loader2, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { READING_STATE_LABELS } from "@/lib/library/types";
import type { ImportPreviewRow, ImportDecision } from "@/lib/library/types";

type ImportPanelProps = {
  onImportComplete: () => void;
};

type PreviewData = {
  previews: ImportPreviewRow[];
  warnings: string[];
  csvText: string;
};

type ConfirmResult = {
  created: number;
  replaced: number;
  skipped: number;
};

export function ImportPanel({ onImportComplete }: ImportPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"idle" | "loading" | "preview" | "confirming" | "done">("idle");
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [decisions, setDecisions] = useState<Map<number, ImportDecision>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConfirmResult | null>(null);

  async function handleFileUpload(file: File) {
    setStep("loading");
    setError(null);

    const formData = new FormData();
    formData.set("file", file);

    try {
      const res = await fetch("/api/library/goodreads/preview", { method: "POST", body: formData });
      const data = await res.json();

      if (data.ok) {
        setPreviewData({ previews: data.previews, warnings: data.warnings, csvText: data.csvText });
        setStep("preview");

        // Pre-fill decisions for conflicts with "keep_existing"
        const initial = new Map<number, ImportDecision>();
        for (const p of data.previews as ImportPreviewRow[]) {
          if (p.hasConflict) {
            initial.set(p.rowIndex, "keep_existing");
          }
        }
        setDecisions(initial);
      } else {
        setError(data.message ?? "Failed to parse CSV.");
        setStep("idle");
      }
    } catch {
      setError("Network error. Please try again.");
      setStep("idle");
    }
  }

  async function handleConfirm() {
    if (!previewData) return;

    setStep("confirming");
    setError(null);

    const decisionArray = Array.from(decisions.entries()).map(([rowIndex, decision]) => ({
      rowIndex,
      decision,
    }));

    try {
      const res = await fetch("/api/library/goodreads/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText: previewData.csvText, decisions: decisionArray }),
      });
      const data = await res.json();

      if (data.ok) {
        setResult({ created: data.created, replaced: data.replaced, skipped: data.skipped });
        setStep("done");
        onImportComplete();
      } else {
        setError(data.message ?? "Import failed.");
        setStep("preview");
      }
    } catch {
      setError("Network error. Please try again.");
      setStep("preview");
    }
  }

  function reset() {
    setStep("idle");
    setPreviewData(null);
    setDecisions(new Map());
    setError(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  const conflicts = previewData?.previews.filter((p) => p.hasConflict) ?? [];
  const newBooks = previewData?.previews.filter((p) => !p.hasConflict) ?? [];

  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Import from Goodreads</h3>
        {step !== "idle" && step !== "loading" && (
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={reset}>
            Reset
          </Button>
        )}
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {/* File picker */}
      {step === "idle" && (
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileUpload(f);
            }}
            className="hidden"
            id="csv-upload"
          />
          <label
            htmlFor="csv-upload"
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm transition hover:bg-accent"
          >
            <Upload className="size-4" />
            Choose CSV file
          </label>
        </div>
      )}

      {step === "loading" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Analyzing CSV…
        </div>
      )}

      {/* Preview */}
      {step === "preview" && previewData && (
        <div className="space-y-3">
          {/* Warnings */}
          {previewData.warnings.length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-1 rounded-lg bg-accent/40 p-3">
              <p className="flex items-center gap-1 text-xs font-medium">
                <AlertTriangle className="size-3" /> Warnings
              </p>
              {previewData.warnings.map((w, i) => (
                <p key={i} className="text-xs text-muted-foreground">{w}</p>
              ))}
            </div>
          )}

          {/* Summary */}
          <p className="text-xs text-muted-foreground">
            {newBooks.length} new · {conflicts.length} conflicts · {previewData.previews.length} total rows
          </p>

          {/* Conflicts */}
          {conflicts.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium">Resolve conflicts:</p>
              <div className="max-h-56 space-y-2 overflow-y-auto">
                {conflicts.map((p) => (
                  <div key={p.rowIndex} className="flex items-center gap-3 rounded-lg border border-border/60 bg-surface/50 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.row.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.row.author || "Unknown"} · {READING_STATE_LABELS[p.row.state]}
                      </p>
                    </div>
                    <select
                      value={decisions.get(p.rowIndex) ?? "keep_existing"}
                      onChange={(e) => {
                        const next = new Map(decisions);
                        next.set(p.rowIndex, e.target.value as ImportDecision);
                        setDecisions(next);
                      }}
                      className="rounded-lg border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="keep_existing">Keep existing</option>
                      <option value="replace_existing">Replace with import</option>
                      <option value="skip_import">Skip import</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button onClick={handleConfirm}>
            Confirm Import
          </Button>
        </div>
      )}

      {step === "confirming" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Importing…
        </div>
      )}

      {/* Done */}
      {step === "done" && result && (
        <div className="space-y-2">
          <p className={cn("flex items-center gap-1 text-sm font-medium text-primary")}>
            <Check className="size-4" /> Import complete!
          </p>
          <p className="text-xs text-muted-foreground">
            {result.created} created · {result.replaced} replaced · {result.skipped} skipped
          </p>
          <Button size="sm" variant="secondary" onClick={reset}>
            Import another
          </Button>
        </div>
      )}
    </Card>
  );
}
