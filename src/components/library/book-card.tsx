"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ExternalLink, UploadCloud, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressArc } from "@/components/dashboard/progress-arc";
import { cn } from "@/lib/utils";
import type { Book } from "@/lib/library/types";
import { READING_STATE_LABELS, type ReadingState } from "@/lib/library/types";

const STATE_COLORS: Record<ReadingState, string> = {
  to_read: "bg-secondary text-secondary-foreground",
  reading: "bg-primary/15 text-primary",
  completed: "bg-accent text-foreground",
};

type BookCardProps = {
  book: Book;
  onEdit: (book: Book) => void;
  onDelete: (book: Book) => void;
};

export function BookCard({ book, onEdit, onDelete }: BookCardProps) {
  const [imgError, setImgError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  // FIXED: Upload errors were silently swallowed — now shown inline
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("bookId", book.id);

      const response = await fetch("/api/uploads/epub", {
        method: "POST",
        body,
      });

      if (response.ok) {
        router.refresh();
      } else {
        // FIXED: Show user-visible error instead of console.error
        setUploadError("Upload failed. Please try again.");
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.18 }}
    >
      <Card className="flex gap-4 p-4">
        {/* Cover */}
        <div className="relative h-28 w-20 shrink-0 rounded-lg bg-secondary/60 overflow-hidden">
          {book.coverUrl && !imgError ? (
            <Image
              src={book.coverUrl}
              alt={`Cover of ${book.title}`}
              fill
              sizes="80px"
              className="object-cover rounded-lg"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground px-1 text-center leading-tight">
              No Cover
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
          <div className="space-y-1">
            <h3 className="truncate text-sm font-semibold leading-tight">
              {book.title}
            </h3>
            {book.author && (
              <p className="truncate text-xs text-muted-foreground">
                {book.author}
              </p>
            )}
            <span
              className={cn(
                "inline-block rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase",
                STATE_COLORS[book.state],
              )}
            >
              {READING_STATE_LABELS[book.state]}
            </span>
          </div>

          {/* Live progress metrics */}
          <div className="flex items-center gap-3">
            {book.state === "reading" && (
              <ProgressArc
                percent={book.progressPercent}
                size={36}
                strokeWidth={3.5}
                color="var(--primary)"
                animate={false}
              />
            )}
            <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
              {book.totalChapters > 0 && book.state === "reading" && (
                <span>
                  Ch {book.currentChapterIndex + 1}/{book.totalChapters}
                </span>
              )}
              <span>
                {book.notesCount} {book.notesCount === 1 ? "note" : "notes"}
              </span>
              {book.streakDays > 0 && <span>{book.streakDays}-day streak</span>}
            </div>
          </div>

          {/* Upload error */}
          {uploadError && (
            <p className="text-[10px] text-destructive">{uploadError}</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1">
            <input
              type="file"
              accept=".epub,application/epub+zip"
              className="hidden"
              ref={fileInputRef}
              onChange={handleUpload}
            />
            {book.uploadId ? (
              <Link href={`/read/${book.id}`}>
                <Button
                  size="sm"
                  variant="default"
                  className="h-7 px-3 text-xs"
                >
                  Read
                </Button>
              </Link>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-3 text-xs gap-1.5"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <UploadCloud className="size-3" />
                )}
                Upload
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => onEdit(book)}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-destructive hover:text-destructive"
              onClick={() => onDelete(book)}
            >
              Delete
            </Button>
            {book.goodreadsSearchUrl && (
              <a
                href={book.goodreadsSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                Goodreads <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
