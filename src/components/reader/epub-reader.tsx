"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import ePub, { type Book, type Rendition, type Location, type NavItem } from "epubjs";
import { Loader2, Highlighter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ReaderControls } from "./reader-controls";
import { AnnotationManager, type Annotation } from "./annotation-manager";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AnnotationColor = "yellow" | "red" | "green" | "blue";
export type ThemeName = "light" | "dark" | "warm" | "night";
export type { NavItem as TocItem };

/** Shape of a raw annotation row from Supabase */
interface AnnotationRow {
  id: string;
  cfi_range: string;
  text_content: string;
  note: string | null;
  color: string;
  created_at: string;
}

interface EpubReaderProps {
  url: string;
  bookId: string;
  bookTitle?: string | undefined;
  initialLocation?: string | undefined;
  onLocationChange?: ((cfi: string) => void) | undefined;
}

// ── Theme CSS ─────────────────────────────────────────────────────────────────
// Each theme embeds highlight SVG fill classes so they survive theme switches.

const HL = `
  .hl-yellow { fill: rgba(250,200,0,0.38); }
  .hl-red    { fill: rgba(220,60,60,0.35); }
  .hl-green  { fill: rgba(40,180,80,0.35); }
  .hl-blue   { fill: rgba(50,130,220,0.35); }
`;

const THEMES: Record<ThemeName, string> = {
  light: `body{color:#1a1a1a;background:#ffffff;}a{color:#2563eb;}p,li,td{text-align:justify;}${HL}`,
  dark:  `body{color:#b5b1ac;background:#1c1917;}a{color:#7dd3fc;}p,li,td{text-align:justify;}${HL}`,
  warm:  `body{color:#4a3728;background:#f5edd6;}a{color:#92400e;}p,li,td{text-align:justify;}${HL}`,
  night: `body{color:#c97150;background:#0d0d0d;}a{color:#f97316;}p,li,td{text-align:justify;}${HL}`,
};

const COLOR_BG: Record<AnnotationColor, string> = {
  yellow: "bg-yellow-300",
  red:    "bg-red-400",
  green:  "bg-green-400",
  blue:   "bg-blue-400",
};

// ── Component ─────────────────────────────────────────────────────────────────

export function EpubReader({
  url,
  bookId,
  bookTitle,
  initialLocation,
  onLocationChange,
}: EpubReaderProps) {
  const viewerRef    = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const bookRef      = useRef<Book | null>(null);
  // Keep a ref in sync so EPUB.js event handlers always see the latest list
  const annotationsRef = useRef<Annotation[]>([]);

  const supabase = createSupabaseBrowserClient();

  // ── Reading state ──────────────────────────────────────────────────────────
  const [isReady,       setIsReady]       = useState(false);
  const [toc,           setToc]           = useState<NavItem[]>([]);
  const [currentCfi,    setCurrentCfi]    = useState(initialLocation ?? "");
  const [currentPercent, setCurrentPercent] = useState(0);
  const [currentChapter, setCurrentChapter] = useState("");

  // ── Typography settings ────────────────────────────────────────────────────
  const [theme,      setTheme]      = useState<ThemeName>("light");
  const [fontSize,   setFontSize]   = useState(18);   // px
  const [fontFamily, setFontFamily] = useState("Literata");
  const [lineHeight, setLineHeight] = useState(1.6);

  // ── Annotations ───────────────────────────────────────────────────────────
  const [annotations,        setAnnotations]        = useState<Annotation[]>([]);
  const [showAnnotations,    setShowAnnotations]    = useState(false);
  const [focusedAnnotationId, setFocusedAnnotationId] = useState<string | null>(null);

  // ── Pending selection (for highlight creation) ─────────────────────────────
  const [pendingSelection, setPendingSelection] = useState<{ cfiRange: string; text: string } | null>(null);
  const [pendingColor,     setPendingColor]     = useState<AnnotationColor>("yellow");

  // Keep ref in sync
  useEffect(() => { annotationsRef.current = annotations; }, [annotations]);

  // ── 1. Load annotations ────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("annotations")
        .select("*")
        .eq("book_id", bookId)
        .order("created_at", { ascending: true });

      if (!error && data) {
        const mapped: Annotation[] = (data as AnnotationRow[]).map((a) => ({
          id:        a.id,
          cfiRange:  a.cfi_range,
          text:      a.text_content,
          note:      a.note ?? undefined,
          color:     a.color as AnnotationColor,
          createdAt: a.created_at,
        }));
        setAnnotations(mapped);
        annotationsRef.current = mapped;
      }
    }
    load();
  }, [bookId, supabase]);

  // ── 2. Persist location + progress (debounced 1 s) ────────────────────────
  useEffect(() => {
    if (!currentCfi || !isReady) return;
    const t = setTimeout(async () => {
      await supabase
        .from("books")
        .update({
          last_read_location: currentCfi,
          progress_percent:   Math.min(100, Math.max(0, currentPercent)),
          last_read_at:       new Date().toISOString(),
        })
        .eq("id", bookId);
    }, 1000);
    return () => clearTimeout(t);
  }, [currentCfi, currentPercent, bookId, isReady, supabase]);

  // ── 3. Apply typography settings ──────────────────────────────────────────
  const applySettings = useCallback(() => {
    const r = renditionRef.current;
    if (!r) return;
    r.themes.select(theme);
    r.themes.fontSize(`${fontSize}px`);
    r.themes.font(fontFamily);
    r.themes.override("line-height", String(lineHeight));
  }, [theme, fontSize, fontFamily, lineHeight]);

  useEffect(() => {
    if (isReady) applySettings();
  }, [applySettings, isReady]);

  // ── 4. Helper: apply all stored annotations to the rendition ──────────────
  const replayAnnotations = useCallback(() => {
    const r = renditionRef.current;
    if (!r) return;
    annotationsRef.current.forEach((ann) => {
      try {
        r.annotations.add("highlight", ann.cfiRange, { id: ann.id }, undefined, `hl-${ann.color}`);
      } catch {
        // Annotation may be out of current view range — silently skip
      }
    });
  }, []);

  // Tracks the current spine href so the chapter-label effect can read it
  const currentHrefRef = useRef<string>("");

  // ── 5. Initialize EPUB book ────────────────────────────────────────────────
  useEffect(() => {
    if (!viewerRef.current) return;

    // Destroy previous instance if URL changes
    bookRef.current?.destroy();

    const book = ePub(url);
    bookRef.current = book;

    const rendition = book.renderTo(viewerRef.current, {
      width:   "100%",
      height:  "100%",
      flow:    "paginated",
      manager: "default",
      allowScriptedContent: false,
    });
    renditionRef.current = rendition;

    // Register all themes (each includes embedded highlight CSS)
    (Object.entries(THEMES) as [ThemeName, string][]).forEach(([name, css]) => {
      rendition.themes.register(name, css);
    });

    // Display
    const display = initialLocation
      ? rendition.display(initialLocation)
      : rendition.display();

    display.then(() => {
      setIsReady(true);
      applySettings();
      replayAnnotations();
    });

    // Location change → track progress + chapter
    rendition.on("relocated", (location: Location) => {
      const cfi  = location.start.cfi;
      const pct  = Math.round(location.start.percentage * 100);
      setCurrentCfi(cfi);
      setCurrentPercent(pct);
      onLocationChange?.(cfi);

      // Store current spine href so the chapter-label effect can use it
      const href = location.start.href;
      currentHrefRef.current = href.split("#")[0] ?? "";
    });

    // Text selection → capture for annotation creation
    rendition.on("selected", (cfiRange: string, contents: { window: Window }) => {
      try {
        const range = rendition.getRange(cfiRange);
        const text  = range?.toString().trim() ?? "";
        if (text.length > 0) {
          setPendingSelection({ cfiRange, text });
        }
        contents.window.getSelection()?.removeAllRanges();
      } catch {
        // getRange can fail when the selected page is no longer rendered
      }
    });

    // Click existing highlight → focus annotation in rail
    rendition.on("markClicked", (cfiRange: string) => {
      const ann = annotationsRef.current.find((a) => a.cfiRange === cfiRange);
      if (ann) {
        setFocusedAnnotationId(ann.id);
        setShowAnnotations(true);
      }
    });

    // Re-apply highlights each time a new spine item is rendered
    rendition.on("rendered", () => {
      replayAnnotations();
    });

    // TOC
    book.loaded.navigation.then((nav) => {
      setToc(nav.toc ?? []);
    });

    // Keyboard navigation
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") rendition.next();
      if (e.key === "ArrowLeft")  rendition.prev();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      bookRef.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  // Derive chapter label whenever toc or cfi changes
  useEffect(() => {
    if (!toc.length || !currentCfi) return;
    const href = currentHrefRef.current || (renditionRef.current?.location?.start?.href?.split("#")[0] ?? "");
    if (!href) return;
    const chapter = toc.find((item) => {
      const itemBase = ((item.href ?? "") as string).split("#")[0] ?? "";
      return itemBase && (href.endsWith(itemBase) || itemBase.endsWith(href));
    });
    setCurrentChapter(chapter?.label ?? "");
  }, [toc, currentCfi]);

  // ── 6. Annotation CRUD ─────────────────────────────────────────────────────
  const addAnnotation = useCallback(async (color: AnnotationColor) => {
    if (!pendingSelection) return;

    const id = crypto.randomUUID();
    const newAnn: Annotation = {
      id,
      cfiRange:  pendingSelection.cfiRange,
      text:      pendingSelection.text,
      color,
      createdAt: new Date().toISOString(),
    };

    // Apply to rendition immediately
    try {
      renditionRef.current?.annotations.add("highlight", newAnn.cfiRange, { id }, undefined, `hl-${color}`);
    } catch { /* out of view */ }

    const next = [...annotationsRef.current, newAnn];
    setAnnotations(next);
    annotationsRef.current = next;
    setPendingSelection(null);

    // Open note rail with new annotation in edit mode
    setFocusedAnnotationId(id);
    setShowAnnotations(true);

    // Persist annotation + update notes_count
    const { data: { user } } = await supabase.auth.getUser();
    await Promise.all([
      supabase.from("annotations").insert({
        id,
        book_id:      bookId,
        user_id:      user?.id,
        cfi_range:    newAnn.cfiRange,
        text_content: newAnn.text,
        color,
      }),
      supabase.from("books").update({ notes_count: next.length }).eq("id", bookId),
    ]);
  }, [pendingSelection, bookId, supabase]);

  const updateAnnotation = useCallback(async (id: string, note: string) => {
    setAnnotations((prev) => prev.map((a) => (a.id === id ? { ...a, note } : a)));
    await supabase.from("annotations").update({ note }).eq("id", id);
  }, [supabase]);

  const deleteAnnotation = useCallback(async (id: string) => {
    const ann = annotationsRef.current.find((a) => a.id === id);
    if (ann) {
      try { renditionRef.current?.annotations.remove(ann.cfiRange, "highlight"); }
      catch { /* out of view */ }
    }
    const next = annotationsRef.current.filter((a) => a.id !== id);
    setAnnotations(next);
    annotationsRef.current = next;
    await Promise.all([
      supabase.from("annotations").delete().eq("id", id),
      supabase.from("books").update({ notes_count: next.length }).eq("id", bookId),
    ]);
  }, [bookId, supabase]);

  // ── 7. Render ──────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-screen flex flex-col overflow-hidden bg-background">

      <ReaderControls
        fontSize={fontSize}
        setFontSize={setFontSize}
        fontFamily={fontFamily}
        setFontFamily={setFontFamily}
        theme={theme}
        setTheme={setTheme}
        lineHeight={lineHeight}
        setLineHeight={setLineHeight}
        toc={toc}
        onChapterSelect={(href) => renditionRef.current?.display(href)}
        currentChapterLabel={currentChapter}
        bookTitle={bookTitle}
        progressPercent={currentPercent}
      />

      <div className="flex-1 w-full h-full relative">
        {/* Loading state */}
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Left nav zone */}
        <div
          className="absolute inset-y-0 left-0 w-[10%] z-[5] cursor-w-resize"
          onClick={() => renditionRef.current?.prev()}
        />
        {/* Right nav zone */}
        <div
          className="absolute inset-y-0 right-0 w-[10%] z-[5] cursor-e-resize"
          onClick={() => renditionRef.current?.next()}
        />

        <div ref={viewerRef} className="w-full h-full" />
      </div>

      {/* Annotations FAB */}
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            setFocusedAnnotationId(null);
            setShowAnnotations((v) => !v);
          }}
          className="relative rounded-full h-12 w-12 shadow-lg bg-background"
          aria-label="Toggle annotations panel"
        >
          <Highlighter className="h-5 w-5" />
          {annotations.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
              {annotations.length > 99 ? "99" : annotations.length}
            </span>
          )}
        </Button>
      </div>

      {/* Selection action bar — slides up from bottom */}
      <AnimatePresence>
        {pendingSelection && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-3 bg-background/95 backdrop-blur-md border-t shadow-2xl"
          >
            {/* Preview of selected text */}
            <p className="flex-1 text-sm text-muted-foreground truncate">
              <span className="font-medium text-foreground italic">
                &ldquo;{pendingSelection.text.length > 55
                  ? pendingSelection.text.slice(0, 55) + "…"
                  : pendingSelection.text}&rdquo;
              </span>
            </p>

            {/* Color swatches */}
            <div className="flex items-center gap-1.5 shrink-0" role="group" aria-label="Highlight color">
              {(["yellow", "red", "green", "blue"] as AnnotationColor[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`${c} highlight`}
                  className={cn(
                    "w-5 h-5 rounded-full border-2 transition-transform duration-150",
                    pendingColor === c ? "scale-125 border-foreground" : "border-transparent",
                    COLOR_BG[c],
                  )}
                  onClick={() => setPendingColor(c)}
                />
              ))}
            </div>

            <Button size="sm" variant="ghost" onClick={() => setPendingSelection(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => addAnnotation(pendingColor)} className="gap-1.5">
              <Highlighter className="h-3.5 w-3.5" />
              Highlight
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Annotation note rail */}
      <AnnotationManager
        annotations={annotations}
        isOpen={showAnnotations}
        onOpenChange={(open) => {
          setShowAnnotations(open);
          if (!open) setFocusedAnnotationId(null);
        }}
        onJumpTo={(cfi) => renditionRef.current?.display(cfi)}
        onDelete={deleteAnnotation}
        onUpdate={updateAnnotation}
        focusedId={focusedAnnotationId}
        onFocusedHandled={() => setFocusedAnnotationId(null)}
      />
    </div>
  );
}
