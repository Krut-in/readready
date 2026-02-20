"use client";

import Link from "next/link";
import { BookOpen, Clock } from "lucide-react";
import { motion } from "framer-motion";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressArc } from "./progress-arc";
import { formatRelativeDate } from "@/lib/progress/calculations";
import type { ActiveBookStat } from "@/lib/progress/types";

interface CurrentReadsWidgetProps {
  books: ActiveBookStat[];
}

/**
 * Widget 1 — Current Reads Snapshot.
 * Shows up to 3 active books with a circular progress arc each.
 */
export function CurrentReadsWidget({ books }: CurrentReadsWidgetProps) {
  const display = books.slice(0, 3);

  if (books.length === 0) {
    return (
      <Card className="flex flex-col gap-3 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <BookOpen className="h-4 w-4 text-primary" />
          Currently Reading
        </h2>
        <p className="text-sm text-muted-foreground">
          No active books.{" "}
          <Link
            href="/library"
            className="text-primary underline underline-offset-2"
          >
            Start one from your library.
          </Link>
        </p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <BookOpen className="h-4 w-4 text-primary" />
        Currently Reading
      </h2>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {display.map((book, i) => (
          <motion.div
            key={book.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.3 }}
            className="flex flex-col items-center gap-3 text-center"
          >
            {/* Progress arc */}
            <ProgressArc
              percent={book.progressPercent}
              size={88}
              strokeWidth={7}
              color="var(--primary)"
            />

            {/* Book metadata */}
            <div className="w-full space-y-0.5">
              <p className="truncate text-xs font-medium" title={book.title}>
                {book.title}
              </p>
              {book.author && (
                <p className="truncate text-[10px] text-muted-foreground">
                  {book.author}
                </p>
              )}
              {book.totalChapters > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  Ch {book.currentChapterIndex + 1} / {book.totalChapters}
                </p>
              )}
              {book.notesCount > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  {book.notesCount} {book.notesCount === 1 ? "note" : "notes"}
                </p>
              )}
              {book.lastReadAt && (
                <p className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="h-2.5 w-2.5" />
                  {formatRelativeDate(book.lastReadAt)}
                </p>
              )}
            </div>

            {/* CTA */}
            <Link href={`/read/${book.id}`} className="w-full">
              <Button
                size="sm"
                variant="outline"
                className="h-7 w-full text-xs"
              >
                Continue
              </Button>
            </Link>
          </motion.div>
        ))}
      </div>

      {books.length > 3 && (
        <p className="text-center text-[11px] text-muted-foreground">
          +{books.length - 3} more active{" "}
          <Link href="/library" className="underline underline-offset-2">
            in library
          </Link>
        </p>
      )}
    </Card>
  );
}
