"use client";

import { TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

import { Card } from "@/components/ui/card";
import { ProgressArc } from "./progress-arc";
import type { ActiveBookStat } from "@/lib/progress/types";

interface ProgressTrendsWidgetProps {
  books: ActiveBookStat[];
  totalPagesAllTime: number;
  totalBooksCompleted: number;
}

// Distinct arc colours for up to 4 active books
const ARC_COLOURS: string[] = [
  "var(--primary)", // brand blue / accent
  "#f97316", // orange
  "#8b5cf6", // violet
  "#10b981", // emerald
];

/**
 * Widget 3 — Progress Trends.
 * Displays all-time reading stats and per-book chapter-completion arcs.
 * Uses circular arcs (not bars) as required by the PRD.
 */
export function ProgressTrendsWidget({
  books,
  totalPagesAllTime,
  totalBooksCompleted,
}: ProgressTrendsWidgetProps) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <TrendingUp className="h-4 w-4 text-primary" />
        Progress Trends
      </h2>

      {/* All-time stat tiles */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="rounded-lg bg-secondary/50 px-3 py-3 text-center"
        >
          <p className="text-2xl font-bold tabular-nums">
            {totalPagesAllTime.toLocaleString()}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">pages read</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="rounded-lg bg-secondary/50 px-3 py-3 text-center"
        >
          <p className="text-2xl font-bold tabular-nums">
            {totalBooksCompleted}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {totalBooksCompleted === 1 ? "book" : "books"} finished
          </p>
        </motion.div>
      </div>

      {/* Per-book chapter-completion arcs */}
      {books.length > 0 ? (
        <div>
          <p className="mb-3 text-[10px] uppercase tracking-wide text-muted-foreground">
            Active books — chapter progress
          </p>
          <div className="flex flex-wrap gap-5">
            {books.slice(0, 4).map((book, i) => {
              // Prefer chapter-based progress; fall back to location %
              // Use 1-indexed chapter (matching BookCard display)
              const chapterPercent =
                book.totalChapters > 0
                  ? Math.round(
                      ((book.currentChapterIndex + 1) / book.totalChapters) *
                        100,
                    )
                  : book.progressPercent;

              return (
                <motion.div
                  key={book.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07, duration: 0.3 }}
                  className="flex flex-col items-center gap-1"
                >
                  <ProgressArc
                    percent={chapterPercent}
                    size={72}
                    strokeWidth={6}
                    color={
                      ARC_COLOURS[i % ARC_COLOURS.length] ?? "var(--primary)"
                    }
                    label={book.title}
                  />
                  {book.totalChapters > 0 && (
                    <p className="text-[9px] text-muted-foreground">
                      Ch {book.currentChapterIndex + 1}/{book.totalChapters}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Start reading to see your progress trends here.
        </p>
      )}
    </Card>
  );
}
