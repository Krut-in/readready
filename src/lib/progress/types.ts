// ── P-4 Progress Types ────────────────────────────────────────────────────────

/** Aggregated reading stats for a single calendar day */
export type DailyReadingStats = {
  date: string;               // "YYYY-MM-DD" (UTC)
  totalPages: number;
  totalWords: number;
  totalDurationSeconds: number;
  booksRead: string[];        // unique book IDs read that day
  qualifies: boolean;         // true when totalPages >= 5
};

/** Result of the streak calculation */
export type StreakResult = {
  currentStreak: number;      // consecutive qualifying days ending today or yesterday
  longestStreak: number;      // all-time best run
  lastReadingDate: string | null; // "YYYY-MM-DD" of most recent qualifying day
};

/** Result of the reading-debt calculation */
export type DebtResult = {
  debt: number;               // missed days, capped at 15
  debtRepaidToday: number;    // extra pages today (beyond 5-page min) applied to debt
  canRepayMore: boolean;      // remaining unpaid debt after today's reading
};

/** Per-book snapshot for dashboard widgets */
export type ActiveBookStat = {
  id: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  progressPercent: number;        // 0-100 EPUB location %
  currentChapterIndex: number;    // 0-indexed
  totalChapters: number;          // from TOC
  notesCount: number;
  lastReadAt: string | null;      // ISO timestamp
  streakDays: number;             // per-book consecutive days
};

/** Full stats payload assembled for the dashboard */
export type DashboardStats = {
  streak: StreakResult;
  debt: DebtResult;
  todayPages: number;
  todayQualifies: boolean;
  weeklyActivity: DailyReadingStats[]; // exactly 7 days, today last
  activeBooks: ActiveBookStat[];
  totalPagesAllTime: number;
  totalBooksCompleted: number;
};

/** Input body for POST /api/progress/session */
export type RecordSessionInput = {
  bookId: string;
  progressStart: number;         // 0-100 percent at session start
  progressEnd: number;           // 0-100 percent at session end
  chapterIndex?: number;         // 0-indexed current chapter
  totalChapters?: number;        // TOC item count
  durationSeconds?: number;      // seconds spent reading
  estimatedTotalWords?: number;  // override 80 000 word default
};
