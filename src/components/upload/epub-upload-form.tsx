"use client";

import { useMemo, useState } from "react";
import { UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getMaxEpubMb } from "@/lib/uploads/epub-upload";
import { validateEpubFile } from "@/lib/validation/epub";

type UploadResponse =
  | {
      ok: true;
      path: string;
      size: number;
      contentType: string;
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

export function EpubUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const maxMb = useMemo(() => getMaxEpubMb(), []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!file) {
      setStatus({ type: "error", message: "Choose an EPUB file before uploading." });
      return;
    }

    const validation = validateEpubFile(file);
    if (!validation.valid) {
      setStatus({ type: "error", message: validation.message });
      return;
    }

    setIsUploading(true);
    setStatus(null);

    try {
      const body = new FormData();
      body.set("file", file);

      const response = await fetch("/api/uploads/epub", {
        method: "POST",
        body,
      });

      const payload = (await response.json()) as UploadResponse;
      if (!response.ok || !payload.ok) {
        const message = payload.ok ? "Upload failed." : payload.message;
        setStatus({ type: "error", message });
        return;
      }

      const sizeMb = (payload.size / (1024 * 1024)).toFixed(2);
      setStatus({
        type: "success",
        message: `Uploaded successfully to ${payload.path} (${sizeMb} MB).`,
      });
      setFile(null);
    } catch {
      setStatus({
        type: "error",
        message: "Upload failed due to a network or server issue. Please retry.",
      });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Card className="max-w-2xl space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Upload EPUB</h2>
        <p className="text-sm text-muted-foreground">
          EPUB only, up to {maxMb} MB. DRM-protected books are not supported in ReadReady.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Select EPUB file</span>
          <input
            className="block w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            type="file"
            name="file"
            accept=".epub,application/epub+zip"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>

        <Button type="submit" disabled={isUploading || !file}>
          <UploadCloud className="mr-2 size-4" />
          {isUploading ? "Uploading..." : "Upload EPUB"}
        </Button>
      </form>

      {status ? (
        <p className={status.type === "success" ? "text-sm text-emerald-600" : "text-sm text-destructive"}>
          {status.message}
        </p>
      ) : null}
    </Card>
  );
}
