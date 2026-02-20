import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { AppError, toApiError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  estimateWordsFromProgress,
  wordsToPages,
  calcBookStreak,
} from "@/lib/progress/calculations";

// ── Validation schema ─────────────────────────────────────────────────────────

const sessionSchema = z.object({
  bookId:              z.string().uuid("bookId must be a valid UUID"),
  progressStart:       z.number().min(0).max(100),
  progressEnd:         z.number().min(0).max(100),
  chapterIndex:        z.number().int().min(0).optional(),
  totalChapters:       z.number().int().min(0).optional(),
  durationSeconds:     z.number().int().min(0).optional(),
  estimatedTotalWords: z.number().int().min(0).optional(),
});

// ── Route ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/progress/session
 *
 * Records a completed reading session and:
 *   1. Inserts a reading_sessions row.
 *   2. Updates books.progress_percent, books.last_read_at, and chapter fields.
 *   3. Recalculates and stores books.streak_days (per-book consecutive days).
 *
 * Called client-side from EpubReader on unmount using fetch + keepalive: true.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new AppError("unauthorized", "Please sign in.", 401);
    }

    const body: unknown = await request.json();
    const parsed = sessionSchema.safeParse(body);

    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Invalid input.";
      throw new AppError("validation_error", msg, 400);
    }

    const {
      bookId,
      progressStart,
      progressEnd,
      chapterIndex,
      totalChapters,
      durationSeconds,
      estimatedTotalWords,
    } = parsed.data;

    // Only record sessions where the user made forward progress
    const delta = progressEnd - progressStart;
    if (delta <= 0) {
      return NextResponse.json({ ok: true, skipped: true, reason: "no_progress" });
    }

    // ── Calculate pages from progress delta ──────────────────────────────────
    const words = estimateWordsFromProgress(delta, estimatedTotalWords);
    const pages = wordsToPages(words);

    // today's date string in UTC format
    const todayDate = new Date().toISOString().slice(0, 10);

    // ── Insert session ────────────────────────────────────────────────────────
    const { error: sessionError } = await supabase
      .from("reading_sessions")
      .insert({
        user_id:          user.id,
        book_id:          bookId,
        session_date:     todayDate,
        pages_read:       pages,
        words_read:       words,
        progress_start:   Math.round(progressStart),
        progress_end:     Math.round(progressEnd),
        chapter_index:    chapterIndex ?? null,
        duration_seconds: durationSeconds ?? null,
      });

    if (sessionError) {
      throw new AppError(
        "session_insert_failed",
        "Failed to record reading session.",
        500,
      );
    }

    // ── Fetch recent book sessions for per-book streak calculation ────────────
    const { data: bookSessions } = await supabase
      .from("reading_sessions")
      .select("session_date, pages_read")
      .eq("book_id", bookId)
      .eq("user_id", user.id)
      .order("session_date", { ascending: false })
      .limit(60); // 60 days is enough to determine any streak

    const bookStreak = calcBookStreak(
      (bookSessions ?? []) as { session_date: string; pages_read: number }[],
    );

    // ── Update book record ────────────────────────────────────────────────────
    const bookUpdate: Record<string, unknown> = {
      progress_percent: Math.min(100, Math.round(progressEnd)),
      last_read_at:     new Date().toISOString(),
      streak_days:      bookStreak,
    };

    if (chapterIndex !== undefined) {
      bookUpdate.current_chapter_index = chapterIndex;
    }
    if (totalChapters !== undefined && totalChapters > 0) {
      bookUpdate.total_chapters = totalChapters;
    }

    await supabase
      .from("books")
      .update(bookUpdate)
      .eq("id", bookId)
      .eq("user_id", user.id);

    return NextResponse.json({ ok: true, pages, words, bookStreak });
  } catch (err) {
    const handled = toApiError(err);
    return NextResponse.json(handled.payload, { status: handled.status });
  }
}
