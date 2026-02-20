"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
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
        <div className="flex h-28 w-20 shrink-0 items-center justify-center rounded-lg bg-secondary/60 text-xs text-muted-foreground overflow-hidden">
          {book.coverUrl ? (
            <img
              src={book.coverUrl}
              alt={`Cover of ${book.title}`}
              className="h-full w-full object-cover rounded-lg"
            />
          ) : (
            <span className="px-1 text-center leading-tight">No Cover</span>
          )}
        </div>

        {/* Info */}
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
          <div className="space-y-1">
            <h3 className="truncate text-sm font-semibold leading-tight">{book.title}</h3>
            {book.author && (
              <p className="truncate text-xs text-muted-foreground">{book.author}</p>
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
              <span>{book.notesCount} {book.notesCount === 1 ? "note" : "notes"}</span>
              {book.streakDays > 0 && (
                <span>{book.streakDays}d streak 🔥</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Link href={`/read/${book.id}`}>
              <Button size="sm" variant="default" className="h-7 px-3 text-xs">
                Read
              </Button>
            </Link>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onEdit(book)}>
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
