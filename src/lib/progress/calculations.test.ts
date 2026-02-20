import test from "node:test";
import assert from "node:assert/strict";

import type { DailyReadingStats } from "./types";
import {
    wordsToPages,
    estimateWordsFromProgress,
    isQualifyingDay,
    toIsoDate,
    calculateStreak,
    calculateReadingDebt,
    formatPages,
    formatRelativeDate,
    calcBookStreak,
    WORDS_PER_PAGE,
    MIN_PAGES_PER_DAY,
    MAX_DEBT_DAYS,
} from "./calculations";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** ISO "YYYY-MM-DD" for a date N days before today (UTC). */
function isoDaysAgo(n: number): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - n);
    return d.toISOString().slice(0, 10);
}

function makeDay(daysAgo: number, pages: number): DailyReadingStats {
    return {
        date: isoDaysAgo(daysAgo),
        totalPages: pages,
        totalWords: pages * WORDS_PER_PAGE,
        totalDurationSeconds: 0,
        booksRead: [],
        qualifies: pages >= MIN_PAGES_PER_DAY,
    };
}

// ── Constants ─────────────────────────────────────────────────────────────────

test("WORDS_PER_PAGE is 250", () => {
    assert.equal(WORDS_PER_PAGE, 250);
});

test("MIN_PAGES_PER_DAY is 5", () => {
    assert.equal(MIN_PAGES_PER_DAY, 5);
});

test("MAX_DEBT_DAYS is 15", () => {
    assert.equal(MAX_DEBT_DAYS, 15);
});

// ── wordsToPages ──────────────────────────────────────────────────────────────

test("wordsToPages: 0 words → 0 pages", () => {
    assert.equal(wordsToPages(0), 0);
});

test("wordsToPages: 249 words → 0 pages (floor)", () => {
    assert.equal(wordsToPages(249), 0);
});

test("wordsToPages: 250 words → 1 page (exact boundary)", () => {
    assert.equal(wordsToPages(250), 1);
});

test("wordsToPages: 500 words → 2 pages", () => {
    assert.equal(wordsToPages(500), 2);
});

test("wordsToPages: 1250 words → 5 pages (qualifying day boundary)", () => {
    assert.equal(wordsToPages(1250), 5);
});

test("wordsToPages: 1251 words → 5 pages (still floor)", () => {
    assert.equal(wordsToPages(1251), 5);
});

// ── estimateWordsFromProgress ─────────────────────────────────────────────────

test("estimateWordsFromProgress: 0% → 0 words", () => {
    assert.equal(estimateWordsFromProgress(0), 0);
});

test("estimateWordsFromProgress: 100% → 80 000 words (default)", () => {
    assert.equal(estimateWordsFromProgress(100), 80_000);
});

test("estimateWordsFromProgress: 10% → 8 000 words (default)", () => {
    assert.equal(estimateWordsFromProgress(10), 8_000);
});

test("estimateWordsFromProgress: 50% with custom total → half", () => {
    assert.equal(estimateWordsFromProgress(50, 10_000), 5_000);
});

test("estimateWordsFromProgress: negative % clamped to 0", () => {
    assert.equal(estimateWordsFromProgress(-10), 0);
});

test("estimateWordsFromProgress: > 100% clamped to 100%", () => {
    assert.equal(estimateWordsFromProgress(150), 80_000);
});

// ── isQualifyingDay ───────────────────────────────────────────────────────────

test("isQualifyingDay: 0 pages → false", () => {
    assert.equal(isQualifyingDay(0), false);
});

test("isQualifyingDay: 4 pages → false (below threshold)", () => {
    assert.equal(isQualifyingDay(4), false);
});

test("isQualifyingDay: 5 pages → true (exact threshold)", () => {
    assert.equal(isQualifyingDay(5), true);
});

test("isQualifyingDay: 100 pages → true", () => {
    assert.equal(isQualifyingDay(100), true);
});

// ── toIsoDate ─────────────────────────────────────────────────────────────────

test("toIsoDate: formats YYYY-MM-DD using UTC", () => {
    const result = toIsoDate(new Date("2024-06-15T00:00:00Z"));
    assert.equal(result, "2024-06-15");
});

test("toIsoDate: end-of-year date", () => {
    const result = toIsoDate(new Date("2024-12-31T23:59:59Z"));
    assert.equal(result, "2024-12-31");
});

test("toIsoDate: zero-pads month and day", () => {
    const result = toIsoDate(new Date("2024-01-05T00:00:00Z"));
    assert.equal(result, "2024-01-05");
});

// ── calculateStreak ───────────────────────────────────────────────────────────

test("calculateStreak: empty stats → all zeros", () => {
    const result = calculateStreak([]);
    assert.equal(result.currentStreak, 0);
    assert.equal(result.longestStreak, 0);
    assert.equal(result.lastReadingDate, null);
});

test("calculateStreak: single qualifying day today → streak 1", () => {
    const result = calculateStreak([makeDay(0, 10)]);
    assert.equal(result.currentStreak, 1);
    assert.equal(result.longestStreak, 1);
    assert.equal(result.lastReadingDate, isoDaysAgo(0));
});

test("calculateStreak: single qualifying day yesterday → streak 1 (grace period)", () => {
    const result = calculateStreak([makeDay(1, 10)]);
    assert.equal(result.currentStreak, 1);
    assert.equal(result.longestStreak, 1);
    assert.equal(result.lastReadingDate, isoDaysAgo(1));
});

test("calculateStreak: today non-qualifying → streak 0", () => {
    const result = calculateStreak([makeDay(0, 3)]);
    assert.equal(result.currentStreak, 0);
    assert.equal(result.longestStreak, 0);
    assert.equal(result.lastReadingDate, null);
});

test("calculateStreak: two consecutive days ending today → streak 2", () => {
    const result = calculateStreak([makeDay(0, 10), makeDay(1, 10)]);
    assert.equal(result.currentStreak, 2);
    assert.equal(result.longestStreak, 2);
});

test("calculateStreak: three consecutive days ending today → streak 3", () => {
    const result = calculateStreak([makeDay(0, 10), makeDay(1, 10), makeDay(2, 10)]);
    assert.equal(result.currentStreak, 3);
    assert.equal(result.longestStreak, 3);
});

test("calculateStreak: gap at yesterday breaks current streak", () => {
    // today and 2 days ago, but not yesterday — gap resets current to 1
    const result = calculateStreak([makeDay(0, 10), makeDay(2, 10)]);
    assert.equal(result.currentStreak, 1);
    assert.equal(result.longestStreak, 1);
});

test("calculateStreak: only old day (2 days ago) → current 0, longest 1", () => {
    const result = calculateStreak([makeDay(2, 10)]);
    assert.equal(result.currentStreak, 0);
    assert.equal(result.longestStreak, 1);
    assert.equal(result.lastReadingDate, isoDaysAgo(2));
});

test("calculateStreak: longest streak tracked across non-consecutive window", () => {
    // 3-day run ending 3 days ago; today + yesterday active
    // Expected: current=2, longest=3
    const stats = [
        makeDay(0, 10),   // today
        makeDay(1, 10),   // yesterday
        makeDay(3, 10),   // 3 days ago  ─┐
        makeDay(4, 10),   // 4 days ago   │ 3-day run
        makeDay(5, 10),   // 5 days ago  ─┘
    ];
    const result = calculateStreak(stats);
    assert.equal(result.currentStreak, 2);
    assert.equal(result.longestStreak, 3);
});

test("calculateStreak: non-qualifying day inside a run breaks longest streak", () => {
    // 5d, 4d, 3d qualify; 2d doesn't; 1d, today qualify
    // current=2, longest=3
    const stats = [
        makeDay(0, 10),
        makeDay(1, 10),
        makeDay(2, 3),   // non-qualifying
        makeDay(3, 10),
        makeDay(4, 10),
        makeDay(5, 10),
    ];
    const result = calculateStreak(stats);
    assert.equal(result.currentStreak, 2);
    assert.equal(result.longestStreak, 3);
});

// ── calculateReadingDebt ──────────────────────────────────────────────────────

test("calculateReadingDebt: active streak → no debt", () => {
    const stats = [makeDay(0, 10), makeDay(1, 10)];
    const result = calculateReadingDebt(stats, 2);
    assert.equal(result.debt, 0);
    assert.equal(result.debtRepaidToday, 0);
    assert.equal(result.canRepayMore, false);
});

test("calculateReadingDebt: no qualifying history → no debt", () => {
    const stats = [makeDay(0, 3)]; // never qualified
    const result = calculateReadingDebt(stats, 0);
    assert.equal(result.debt, 0);
    assert.equal(result.canRepayMore, false);
});

test("calculateReadingDebt: empty stats → no debt", () => {
    const result = calculateReadingDebt([], 0);
    assert.equal(result.debt, 0);
});

test("calculateReadingDebt: last qualified yesterday → debt 0 (today is opportunity)", () => {
    // daysSince = 1 → missedDays = max(0, 1-1) = 0
    const stats = [makeDay(1, 10)];
    const result = calculateReadingDebt(stats, 0);
    assert.equal(result.debt, 0);
    assert.equal(result.canRepayMore, false);
});

test("calculateReadingDebt: last qualified 2 days ago → debt 1", () => {
    // daysSince = 2 → missedDays = 1 → debt = 1
    const stats = [makeDay(2, 10)];
    const result = calculateReadingDebt(stats, 0);
    assert.equal(result.debt, 1);
    assert.equal(result.debtRepaidToday, 0);
    assert.equal(result.canRepayMore, true);
});

test("calculateReadingDebt: missed days capped at 15", () => {
    // daysSince = 20 → missedDays = 19 → debt = min(15, 19) = 15
    const stats = [makeDay(20, 10)];
    const result = calculateReadingDebt(stats, 0);
    assert.equal(result.debt, MAX_DEBT_DAYS);
    assert.equal(result.canRepayMore, true);
});

test("calculateReadingDebt: today qualifying found first → debt 0 even with currentStreak=0", () => {
    // When today qualifies (8 pages >= 5), dailyStats.find(d => d.qualifies) returns
    // today as the lastQualifying day, so daysSince=0, debt=0.
    // This verifies the function is self-consistent regardless of the passed-in streak.
    const stats = [
        makeDay(0, 8),   // today: qualifies=true
        makeDay(4, 10),  // 4 days ago: qualifies=true
    ];
    const result = calculateReadingDebt(stats, 0);
    assert.equal(result.debt, 0);
    assert.equal(result.debtRepaidToday, 0);
    assert.equal(result.canRepayMore, false);
});

test("calculateReadingDebt: non-qualifying today pages do not repay debt", () => {
    // last qualified 5 days ago: daysSince=5, missedDays=4, debt=4
    // today: 3 pages (below 5) → extraPages = max(0, 3-5) = 0 → debtRepaidToday=0
    const stats = [
        makeDay(0, 3),   // today: does not qualify
        makeDay(5, 10),  // 5 days ago: last qualifying
    ];
    const result = calculateReadingDebt(stats, 0);
    assert.equal(result.debt, 4);
    assert.equal(result.debtRepaidToday, 0);
    assert.equal(result.canRepayMore, true);
});

// ── formatPages ───────────────────────────────────────────────────────────────

test("formatPages: 0 → '0 pages'", () => {
    assert.equal(formatPages(0), "0 pages");
});

test("formatPages: 1 → '1 page' (singular)", () => {
    assert.equal(formatPages(1), "1 page");
});

test("formatPages: 2 → '2 pages' (plural)", () => {
    assert.equal(formatPages(2), "2 pages");
});

test("formatPages: 100 → '100 pages'", () => {
    assert.equal(formatPages(100), "100 pages");
});

// ── formatRelativeDate ────────────────────────────────────────────────────────

test("formatRelativeDate: null → 'Never'", () => {
    assert.equal(formatRelativeDate(null), "Never");
});

test("formatRelativeDate: today's ISO date → 'Today'", () => {
    assert.equal(formatRelativeDate(isoDaysAgo(0)), "Today");
});

test("formatRelativeDate: yesterday's ISO date → 'Yesterday'", () => {
    assert.equal(formatRelativeDate(isoDaysAgo(1)), "Yesterday");
});

test("formatRelativeDate: ISO timestamp normalises to date", () => {
    const todayTimestamp = new Date().toISOString(); // e.g. "2026-02-19T14:30:00.000Z"
    assert.equal(formatRelativeDate(todayTimestamp), "Today");
});

test("formatRelativeDate: old date returns formatted month+day string", () => {
    const result = formatRelativeDate("2024-01-05");
    // Should not be "Today" or "Yesterday", should be a non-empty string
    assert.ok(result.length > 0);
    assert.notEqual(result, "Today");
    assert.notEqual(result, "Yesterday");
    assert.notEqual(result, "Never");
    // en-US format: "Jan 5"
    assert.equal(result, "Jan 5");
});

// ── calcBookStreak ────────────────────────────────────────────────────────────

type SessionRow = { session_date: string; pages_read: number };

function makeSession(daysAgo: number, pages: number): SessionRow {
    return { session_date: isoDaysAgo(daysAgo), pages_read: pages };
}

test("calcBookStreak: empty sessions → 0", () => {
    assert.equal(calcBookStreak([]), 0);
});

test("calcBookStreak: qualifying session today → 1", () => {
    assert.equal(calcBookStreak([makeSession(0, 10)]), 1);
});

test("calcBookStreak: qualifying session yesterday → 1 (grace period)", () => {
    assert.equal(calcBookStreak([makeSession(1, 10)]), 1);
});

test("calcBookStreak: today and yesterday → 2", () => {
    assert.equal(
        calcBookStreak([makeSession(0, 10), makeSession(1, 10)]),
        2,
    );
});

test("calcBookStreak: two sessions same day aggregate to qualifying", () => {
    // 2 + 5 = 7 pages on the same day → qualifies → streak 1
    assert.equal(
        calcBookStreak([makeSession(0, 2), makeSession(0, 5)]),
        1,
    );
});

test("calcBookStreak: gap at yesterday breaks streak", () => {
    // today and 2 days ago but not yesterday
    assert.equal(
        calcBookStreak([makeSession(0, 10), makeSession(2, 10)]),
        1,
    );
});

test("calcBookStreak: non-qualifying today with qualifying yesterday → 1", () => {
    // today has 2 pages (not anchor), yesterday has 10 (anchor)
    const result = calcBookStreak([makeSession(0, 2), makeSession(1, 10)]);
    assert.equal(result, 1);
});

test("calcBookStreak: no qualifying day in recent window → 0", () => {
    // today has 3 pages, yesterday has 2 pages — neither qualifies
    assert.equal(
        calcBookStreak([makeSession(0, 3), makeSession(1, 2)]),
        0,
    );
});
