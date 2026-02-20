"use client";

import { Flame, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatRelativeDate, MIN_PAGES_PER_DAY } from "@/lib/progress/calculations";
import type { StreakResult, DebtResult, DailyReadingStats } from "@/lib/progress/types";

interface StreakWidgetProps {
  streak: StreakResult;
  debt: DebtResult;
  todayPages: number;
  todayQualifies: boolean;
  weeklyActivity: DailyReadingStats[]; // 7 entries, oldest→newest
}

// Short day labels (Mon–Sun). getDay() is 0=Sun…6=Sat.
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Widget 2 — Streak & Consistency.
 * Shows the current streak counter, weekly activity dots, today's status,
 * and the Reading Debt card (owed sessions framing, non-punitive language).
 */
export function StreakWidget({
  streak,
  debt,
  todayPages,
  todayQualifies,
  weeklyActivity,
}: StreakWidgetProps) {
  return (
    <Card className="flex flex-col gap-5 p-5">
      {/* Header */}
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Flame className="h-4 w-4 text-orange-500" />
        Streak &amp; Consistency
      </h2>

      {/* Streak counter */}
      <div className="flex items-end gap-4">
        <motion.div
          initial={{ scale: 0.75, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 20 }}
          className="flex items-baseline gap-1"
        >
          <span className="text-4xl font-bold tabular-nums leading-none">
            {streak.currentStreak}
          </span>
          <span className="text-sm text-muted-foreground">
            {streak.currentStreak === 1 ? "day" : "days"}
          </span>
        </motion.div>

        <div className="space-y-0.5 pb-0.5 text-[11px] text-muted-foreground">
          <p>Best: {streak.longestStreak} days</p>
          <p>Last read: {formatRelativeDate(streak.lastReadingDate)}</p>
        </div>
      </div>

      {/* Weekly activity — 7 circles, one per day */}
      <div>
        <p className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
          This week
        </p>
        <div className="flex items-center justify-between gap-1">
          {weeklyActivity.map((day, i) => {
            const dayOfWeek = new Date(day.date + "T12:00:00Z").getUTCDay();
            const label     = DAY_LABELS[dayOfWeek] ?? "";

            return (
              <div key={day.date} className="flex flex-1 flex-col items-center gap-1.5">
                {/* Dot: filled = qualifying, partial = some reading, empty = none */}
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.04, duration: 0.25 }}
                  title={`${day.date}: ${day.totalPages} pages`}
                  className={cn(
                    "h-6 w-6 rounded-full border-2 transition-colors",
                    day.qualifies
                      ? "border-primary bg-primary"
                      : day.totalPages > 0
                      ? "border-primary bg-primary/30"
                      : "border-muted bg-transparent",
                  )}
                />
                <span className="text-[9px] text-muted-foreground">{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Today's reading status */}
      <div
        className={cn(
          "rounded-lg px-3 py-2.5 text-xs",
          todayQualifies
            ? "bg-green-500/10 text-green-700 dark:text-green-400"
            : "bg-secondary text-muted-foreground",
        )}
      >
        {todayQualifies
          ? `✓ Today qualifies — ${todayPages} ${todayPages === 1 ? "page" : "pages"} read`
          : todayPages > 0
          ? `${todayPages} / ${MIN_PAGES_PER_DAY} pages today — almost there!`
          : `Read ${MIN_PAGES_PER_DAY} pages today to continue your streak.`}
      </div>

      {/* Reading Debt card — shown only when debt > 0 */}
      {debt.debt > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 dark:border-amber-900 dark:bg-amber-950/30"
        >
          <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            <TrendingDown className="h-3.5 w-3.5 shrink-0" />
            {debt.debt} owed{" "}
            {debt.debt === 1 ? "session" : "sessions"}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {debt.debtRepaidToday > 0
              ? `${debt.debtRepaidToday} repaid today. `
              : ""}
            {debt.canRepayMore
              ? "Read extra pages beyond your daily 5 to catch up — no rush."
              : "All sessions repaid for today — great going!"}
          </p>
        </motion.div>
      )}
    </Card>
  );
}
