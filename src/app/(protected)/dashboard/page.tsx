import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  calculateStreak,
  calculateReadingDebt,
  toIsoDate,
} from "@/lib/progress/calculations";
import { CurrentReadsWidget } from "@/components/dashboard/current-reads-widget";
import { StreakWidget } from "@/components/dashboard/streak-widget";
import { ProgressTrendsWidget } from "@/components/dashboard/progress-trends-widget";
import type {
  DailyReadingStats,
  DashboardStats,
  ActiveBookStat,
} from "@/lib/progress/types";

// ── Server-side data fetching ─────────────────────────────────────────────────

async function getStats(userId: string): Promise<DashboardStats> {
  const supabase = await createSupabaseServerClient();

  // Fetch last 90 days of sessions + all user books in parallel
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setUTCDate(ninetyDaysAgo.getUTCDate() - 90);
  const ninetyStr = toIsoDate(ninetyDaysAgo);

  const [sessionsRes, booksRes] = await Promise.all([
    supabase
      .from("reading_sessions")
      .select("session_date, pages_read, words_read, duration_seconds, book_id")
      .eq("user_id", userId)
      .gte("session_date", ninetyStr)
      .order("session_date", { ascending: false }),
    supabase
      .from("books")
      .select(
        "id, title, author, cover_url, progress_percent, current_chapter_index, total_chapters, notes_count, last_read_at, streak_days, state",
      )
      .eq("user_id", userId),
  ]);

  const rawSessions = sessionsRes.data ?? [];
  const rawBooks    = booksRes.data ?? [];

  // ── Aggregate sessions by calendar date ─────────────────────────────────
  const byDate = new Map<
    string,
    { pages: number; words: number; duration: number; bookIds: Set<string> }
  >();

  for (const s of rawSessions) {
    const entry = byDate.get(s.session_date) ?? {
      pages: 0,
      words: 0,
      duration: 0,
      bookIds: new Set<string>(),
    };
    entry.pages    += s.pages_read    ?? 0;
    entry.words    += s.words_read    ?? 0;
    entry.duration += s.duration_seconds ?? 0;
    entry.bookIds.add(s.book_id as string);
    byDate.set(s.session_date as string, entry);
  }

  // Build DailyReadingStats sorted newest-first (as required by streak calc)
  const dailyStats: DailyReadingStats[] = Array.from(byDate.entries())
    .map(([date, v]) => ({
      date,
      totalPages:           v.pages,
      totalWords:           v.words,
      totalDurationSeconds: v.duration,
      booksRead:            Array.from(v.bookIds),
      qualifies:            v.pages >= 5,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  // ── Streak + debt ─────────────────────────────────────────────────────────
  const streak = calculateStreak(dailyStats);
  const debt   = calculateReadingDebt(dailyStats, streak.currentStreak);

  // ── Today ─────────────────────────────────────────────────────────────────
  const todayStr   = toIsoDate(new Date());
  const todayEntry = dailyStats.find((d) => d.date === todayStr);
  const todayPages = todayEntry?.totalPages ?? 0;

  // ── Weekly activity (oldest → newest so UI renders left → right) ─────────
  const weeklyActivity: DailyReadingStats[] = [];
  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - offset);
    const dateStr = toIsoDate(d);
    weeklyActivity.push(
      dailyStats.find((x) => x.date === dateStr) ?? {
        date:                 dateStr,
        totalPages:           0,
        totalWords:           0,
        totalDurationSeconds: 0,
        booksRead:            [],
        qualifies:            false,
      },
    );
  }

  // ── Active books snapshot ─────────────────────────────────────────────────
  const activeBooks: ActiveBookStat[] = rawBooks
    .filter((b) => b.state === "reading")
    .map((b) => ({
      id:                  b.id as string,
      title:               b.title as string,
      author:              (b.author as string) ?? null,
      coverUrl:            (b.cover_url as string) ?? null,
      progressPercent:     (b.progress_percent as number) ?? 0,
      currentChapterIndex: (b.current_chapter_index as number) ?? 0,
      totalChapters:       (b.total_chapters as number) ?? 0,
      notesCount:          (b.notes_count as number) ?? 0,
      lastReadAt:          (b.last_read_at as string) ?? null,
      streakDays:          (b.streak_days as number) ?? 0,
    }))
    .sort((a, b) =>
      (b.lastReadAt ?? "").localeCompare(a.lastReadAt ?? ""),
    );

  // ── All-time totals ───────────────────────────────────────────────────────
  const totalPagesAllTime = rawSessions.reduce(
    (sum, s) => sum + ((s.pages_read as number) ?? 0),
    0,
  );
  const totalBooksCompleted = rawBooks.filter((b) => b.state === "completed").length;

  return {
    streak,
    debt,
    todayPages,
    todayQualifies: todayPages >= 5,
    weeklyActivity,
    activeBooks,
    totalPagesAllTime,
    totalBooksCompleted,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // user is guaranteed by the protected layout's middleware
  const stats = await getStats(user!.id);

  const { streak, debt, todayPages, todayQualifies, weeklyActivity, activeBooks } =
    stats;

  const greetingName = user?.user_metadata?.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Hi, {greetingName}
          {streak.currentStreak > 0
            ? ` — ${streak.currentStreak} day streak! 🔥`
            : "."}
        </h1>
        <p className="text-sm text-muted-foreground">
          {todayQualifies
            ? "You've hit your reading goal for today."
            : `Read ${Math.max(0, 5 - todayPages)} more ${todayPages === 4 ? "page" : "pages"} to qualify today.`}
        </p>
      </header>

      {/* Row 1: Current Reads | Streak & Consistency */}
      <div className="grid gap-4 md:grid-cols-2">
        <CurrentReadsWidget books={activeBooks} />
        <StreakWidget
          streak={streak}
          debt={debt}
          todayPages={todayPages}
          todayQualifies={todayQualifies}
          weeklyActivity={weeklyActivity}
        />
      </div>

      {/* Row 2: Progress Trends (full width) */}
      <ProgressTrendsWidget
        books={activeBooks}
        totalPagesAllTime={stats.totalPagesAllTime}
        totalBooksCompleted={stats.totalBooksCompleted}
      />
    </div>
  );
}
