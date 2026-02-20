/**
 * Core P-4 progress calculations — pure functions, no side effects.
 *
 * Rules (from PRD / system prompt):
 *   250 words = 1 page
 *   A qualifying reading day requires >= 5 pages
 *   Reading debt = days since last qualifying day (minus today), capped at 15
 *   Debt repayment: extra pages beyond the 5-page minimum repay debt 1-for-1
 */

import type { DailyReadingStats, StreakResult, DebtResult } from "./types";

// ── Constants ─────────────────────────────────────────────────────────────────

export const WORDS_PER_PAGE = 250;
export const MIN_PAGES_PER_DAY = 5;
export const MAX_DEBT_DAYS = 15;
export const DEFAULT_BOOK_WORDS = 80_000; // average novel word count

// ── Page / word helpers ───────────────────────────────────────────────────────

/** How many full pages does a given word count represent? (floor) */
export function wordsToPages(words: number): number {
  return Math.floor(words / WORDS_PER_PAGE);
}

/**
 * Estimate words read from an EPUB progress-percentage delta.
 * progressDelta is in [0, 100]; estimatedTotalWords defaults to 80 000.
 */
export function estimateWordsFromProgress(
  progressDelta: number,
  estimatedTotalWords: number = DEFAULT_BOOK_WORDS,
): number {
  const clamped = Math.max(0, Math.min(100, progressDelta));
  return Math.round((clamped / 100) * estimatedTotalWords);
}

/** A day qualifies for streak counting only when totalPages >= MIN_PAGES_PER_DAY */
export function isQualifyingDay(totalPages: number): boolean {
  return totalPages >= MIN_PAGES_PER_DAY;
}

// ── Date utilities ────────────────────────────────────────────────────────────

/** Return UTC midnight for a given Date */
function utcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Format a Date as "YYYY-MM-DD" (UTC) */
export function toIsoDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const DAY_MS = 86_400_000;

// ── Streak calculation ────────────────────────────────────────────────────────

/**
 * Calculate current and all-time best reading streaks.
 *
 * @param dailyStats Array of aggregated daily stats sorted **newest first** (DESC).
 *
 * Current streak rules:
 *   - The streak is "live" only when the most recent qualifying day is
 *     today or yesterday (grace period for the current day not yet done).
 *   - Any gap (missing qualifying day) resets the current streak to 0.
 *
 * Longest streak scans the full history ascending.
 */
export function calculateStreak(dailyStats: DailyReadingStats[]): StreakResult {
  if (dailyStats.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastReadingDate: null };
  }

  const todayMs     = utcMidnight(new Date()).getTime();
  const yesterdayMs = todayMs - DAY_MS;

  // ── Current streak (walk backwards from today) ──────────────────────────
  let currentStreak = 0;
  let expectedMs: number | null = null;

  for (const day of dailyStats) {
    const dayMs = utcMidnight(new Date(day.date)).getTime();

    if (currentStreak === 0) {
      // First entry must be today or yesterday to start an active streak
      if (dayMs !== todayMs && dayMs !== yesterdayMs) break;
      if (!day.qualifies) break;
      expectedMs = dayMs;
      currentStreak = 1;
    } else {
      // Each subsequent entry must be exactly one day before the previous
      if (dayMs !== expectedMs! - DAY_MS) break; // gap
      if (!day.qualifies) break;                  // non-qualifying day
      expectedMs = dayMs;
      currentStreak++;
    }
  }

  // ── Longest streak (scan full history ascending) ────────────────────────
  const ascending = [...dailyStats].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  let longestStreak = 0;
  let tempStreak    = 0;
  let prevMs: number | null = null;

  for (const day of ascending) {
    if (!day.qualifies) {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 0;
      prevMs = null;
      continue;
    }
    const dayMs = utcMidnight(new Date(day.date)).getTime();
    if (prevMs === null || dayMs === prevMs + DAY_MS) {
      tempStreak++;
    } else {
      // Gap between qualifying days: save current run before restarting.
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
    prevMs = dayMs;
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  const lastQualifying = dailyStats.find((d) => d.qualifies);
  return { currentStreak, longestStreak, lastReadingDate: lastQualifying?.date ?? null };
}

// ── Reading debt calculation ──────────────────────────────────────────────────

/**
 * Calculate reading debt and today's repayment progress.
 *
 * Debt formula:
 *   - If currentStreak > 0 → no debt.
 *   - Otherwise: debt = min(15, daysSinceLastQualifyingDay − 1)
 *     (The −1 gives the user their current day as the repayment opportunity.)
 *   - Extra pages beyond the 5/day minimum repay debt 1 page-for-1 missed day.
 *
 * @param dailyStats Newest-first sorted array (same as used in calculateStreak).
 * @param currentStreak Result from calculateStreak.
 */
export function calculateReadingDebt(
  dailyStats: DailyReadingStats[],
  currentStreak: number,
): DebtResult {
  if (currentStreak > 0) {
    return { debt: 0, debtRepaidToday: 0, canRepayMore: false };
  }

  const lastQualifying = dailyStats.find((d) => d.qualifies);
  if (!lastQualifying) {
    // Fresh account or never completed a qualifying day — no debt yet.
    return { debt: 0, debtRepaidToday: 0, canRepayMore: false };
  }

  const todayMs   = utcMidnight(new Date()).getTime();
  const lastMs    = utcMidnight(new Date(lastQualifying.date)).getTime();
  const daysSince = Math.round((todayMs - lastMs) / DAY_MS);

  // Days after the last qualifying day, excluding today (today is the opportunity)
  const missedDays = Math.max(0, daysSince - 1);
  const debt       = Math.min(MAX_DEBT_DAYS, missedDays);

  // How many pages did the user read today?
  const todayStr   = toIsoDate(new Date());
  const todayEntry = dailyStats.find((d) => d.date === todayStr);
  const todayPages = todayEntry?.totalPages ?? 0;

  // Pages beyond the minimum repay debt (1 extra page = 1 owed session repaid)
  const extraPages      = Math.max(0, todayPages - MIN_PAGES_PER_DAY);
  const debtRepaidToday = Math.min(extraPages, debt);
  const canRepayMore    = debt - debtRepaidToday > 0;

  return { debt, debtRepaidToday, canRepayMore };
}

// ── Formatting helpers ────────────────────────────────────────────────────────

/** Pluralised page count: "1 page" | "3 pages" */
export function formatPages(pages: number): string {
  return `${pages} ${pages === 1 ? "page" : "pages"}`;
}

/** Human-friendly relative date: "Today" | "Yesterday" | "Jan 5" */
export function formatRelativeDate(isoDateOrTimestamp: string | null): string {
  if (!isoDateOrTimestamp) return "Never";
  const dateStr = isoDateOrTimestamp.slice(0, 10); // normalise timestamp → date
  const today     = toIsoDate(new Date());
  const yesterday = toIsoDate(new Date(Date.now() - DAY_MS));
  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  const d = new Date(dateStr + "T12:00:00Z"); // noon UTC avoids DST edge cases
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Per-book streak helper (used in session API) ──────────────────────────────

/**
 * Calculate the streak for a single book given its raw session rows.
 * Sessions should be sorted newest-first (DESC by session_date).
 * This follows the same 5-pages rule but scoped to one book.
 */
export function calcBookStreak(
  sessions: { session_date: string; pages_read: number }[],
): number {
  // Aggregate pages per date
  const byDate = new Map<string, number>();
  for (const s of sessions) {
    byDate.set(s.session_date, (byDate.get(s.session_date) ?? 0) + s.pages_read);
  }

  const todayMs     = utcMidnight(new Date()).getTime();
  const yesterdayMs = todayMs - DAY_MS;

  // Find the anchor date (today or yesterday with qualifying pages)
  const todayStr     = toIsoDate(new Date());
  const yesterdayStr = toIsoDate(new Date(Date.now() - DAY_MS));

  const anchorMs =
    (byDate.get(todayStr) ?? 0) >= MIN_PAGES_PER_DAY
      ? todayMs
      : (byDate.get(yesterdayStr) ?? 0) >= MIN_PAGES_PER_DAY
      ? yesterdayMs
      : null;

  if (anchorMs === null) return 0;

  let streak    = 0;
  let expectedMs = anchorMs;

  while (true) {
    const dateStr = toIsoDate(new Date(expectedMs));
    const pages   = byDate.get(dateStr) ?? 0;
    if (pages < MIN_PAGES_PER_DAY) break;
    streak++;
    expectedMs -= DAY_MS;
  }

  return streak;
}
