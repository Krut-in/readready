"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import ePub, { type Book, type Rendition } from "epubjs";
import { Loader2, Highlighter } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ReaderControls } from "./reader-controls";
import { AnnotationManager, type Annotation } from "./annotation-manager";
import { Button } from "@/components/ui/button";

interface EpubReaderProps {
  url: string;
  bookId: string;
  initialLocation?: string;
  onLocationChange?: (cfi: string) => void;
  onTocLoaded?: (toc: any[]) => void;
}

export function EpubReader({ 
  url, 
  bookId,
  initialLocation, 
  onLocationChange,
  onTocLoaded 
}: EpubReaderProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const bookRef = useRef<Book | null>(null);
  const supabase = createSupabaseBrowserClient();
  
  const [isReady, setIsReady] = useState(false);
  const [toc, setToc] = useState<any[]>([]);
  const [currentCfi, setCurrentCfi] = useState<string>(initialLocation || "");
  
  // Settings State
  const [theme, setTheme] = useState("light");
  const [fontSize, setFontSize] = useState(100);
  const [fontFamily, setFontFamily] = useState("Literata");
  const [lineHeight, setLineHeight] = useState(1.5);

  // Annotations State
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [selection, setSelection] = useState<{ cfiRange: string; text: string; rect?: DOMRect } | null>(null);

  // Save location debounce
  useEffect(() => {
    if (!currentCfi || !isReady) return;

    const timeout = setTimeout(async () => {
      // Save to DB
      const { error } = await supabase
        .from('books')
        .update({ last_read_location: currentCfi })
        .eq('id', bookId);
        
      if (error) console.error("Failed to save location:", error);
    }, 1000);

    return () => clearTimeout(timeout);
  }, [currentCfi, bookId, isReady, supabase]);

  // Load Annotations
  useEffect(() => {
    async function loadAnnotations() {
        // Assume annotations table exists
        const { data, error } = await supabase
            .from('annotations')
            .select('*')
            .eq('book_id', bookId);

        if (!error && data) {
            const mapped = data.map((a: any) => ({
                id: a.id,
                cfiRange: a.cfi_range,
                text: a.text_content,
                note: a.note,
                color: a.color,
                createdAt: a.created_at
            }));
            setAnnotations(mapped);
        }
    }
    loadAnnotations();
  }, [bookId, supabase]);

  // Apply Annotations to Rendition
  useEffect(() => {
    if (!renditionRef.current || !isReady) return;
    
    annotations.forEach(ann => {
        try {
            renditionRef.current?.annotations.add("highlight", ann.cfiRange, { id: ann.id }, undefined, `hl-${ann.color}`);
        } catch (e) {
            console.error("Failed to render annotation:", e);
        }
    });
  }, [annotations, isReady]);

  // Initialize Book
  useEffect(() => {
    if (!viewerRef.current) return;
    
    if (bookRef.current) {
      bookRef.current.destroy();
    }

    const book = ePub(url);
    bookRef.current = book;

    const rendition = book.renderTo(viewerRef.current, {
      width: "100%",
      height: "100%",
      flow: "paginated",
      manager: "default",
      // @ts-ignore
      allowScriptedContent: false,
    });
    renditionRef.current = rendition;

    const displayPromise = initialLocation 
      ? rendition.display(initialLocation) 
      : rendition.display();

    displayPromise.then(() => {
      setIsReady(true);
      registerThemes(rendition);
      applySettings();
    });

    rendition.on("relocated", (location: any) => {
      setCurrentCfi(location.start.cfi);
      onLocationChange?.(location.start.cfi);
    });

    rendition.on("selected", (cfiRange: string, contents: any) => {
      const range = rendition.getRange(cfiRange);
      const text = range.toString();
      // Simple selection handling: just store it state to show a button
      // For now, let's immediately create a highlight to test
      setSelection({ cfiRange, text });
      
      // Clear selection visually in browser so we can render our own highlight
      contents.window.getSelection().removeAllRanges();
    });

    book.loaded.navigation.then((nav: any) => {
      setToc(nav.toc);
      onTocLoaded?.(nav.toc);
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") rendition.next();
      if (e.key === "ArrowLeft") rendition.prev();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (bookRef.current) {
        bookRef.current.destroy();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const registerThemes = (rendition: Rendition) => {
    const highlights = `
      ::selection { background: rgba(255, 255, 0, 0.3); }
      .hl-yellow { fill: yellow; fill-opacity: 0.3; mix-blend-mode: multiply; }
      .hl-red { fill: red; fill-opacity: 0.3; mix-blend-mode: multiply; }
      .hl-green { fill: green; fill-opacity: 0.3; mix-blend-mode: multiply; }
      .hl-blue { fill: blue; fill-opacity: 0.3; mix-blend-mode: multiply; }
    `;

    rendition.themes.register("light", { 
      body: { color: "#000", background: "#fff" } 
    });
    rendition.themes.register("dark", { 
      body: { color: "#A8A29E", background: "#0c0a09" } 
    });
    rendition.themes.register("sepia", { 
      body: { color: "#5f4b32", background: "#f6f1d1" } 
    });
    
    // Register global styles
    // @ts-ignore
    rendition.themes.register("highlights", highlights);
    // @ts-ignore
    rendition.themes.select("highlights");
  };

  const applySettings = useCallback(() => {
    if (!renditionRef.current) return;
    const r = renditionRef.current;
    
    r.themes.select(theme);
    r.themes.fontSize(`${fontSize}%`);
    r.themes.font(fontFamily);
  }, [theme, fontSize, fontFamily]);

  useEffect(() => {
    applySettings();
  }, [applySettings]);

  const addAnnotation = async () => {
    if (!selection) return;

    // Optimistic Update
    const newAnn: Annotation = {
        id: crypto.randomUUID(),
        cfiRange: selection.cfiRange,
        text: selection.text,
        color: "yellow",
        createdAt: new Date().toISOString()
    };

    setAnnotations(prev => [...prev, newAnn]);
    setSelection(null);
    setShowAnnotations(true);

    // Persist
    const { error } = await supabase
        .from('annotations')
        .insert({
            id: newAnn.id,
            book_id: bookId,
            cfi_range: newAnn.cfiRange,
            text_content: newAnn.text,
            color: newAnn.color
        });

    if (error) console.error("Failed to save annotation:", error);
  };

  const updateAnnotation = async (id: string, note: string) => {
    setAnnotations(prev => prev.map(a => a.id === id ? { ...a, note } : a));
    
    const { error } = await supabase
        .from('annotations')
        .update({ note })
        .eq('id', id);

    if (error) console.error("Failed to update note:", error);
  };

  const deleteAnnotation = async (id: string) => {
    const ann = annotations.find(a => a.id === id);
    if (ann && renditionRef.current) {
        renditionRef.current.annotations.remove(ann.cfiRange, "highlight");
    }

    setAnnotations(prev => prev.filter(a => a.id !== id));

    const { error } = await supabase
        .from('annotations')
        .delete()
        .eq('id', id);
        
    if (error) console.error("Failed to delete annotation:", error);
  };

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
        currentChapterLabel=""
      />

      <div className="flex-1 w-full h-full relative">
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        
        {/* Navigation Zones */}
        <div 
          className="absolute inset-y-0 left-0 w-[10%] z-[5] cursor-w-resize hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          onClick={() => renditionRef.current?.prev()}
        />
        <div 
          className="absolute inset-y-0 right-0 w-[10%] z-[5] cursor-e-resize hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          onClick={() => renditionRef.current?.next()}
        />

        {/* Floating Highlight Button */}
        {selection && (
            <div className="absolute z-50 top-20 right-20 animate-in fade-in zoom-in duration-200">
                <Button onClick={addAnnotation} className="gap-2 shadow-xl">
                    <Highlighter className="h-4 w-4" />
                    Highlight Selection
                </Button>
            </div>
        )}

        <div ref={viewerRef} className="w-full h-full" />
      </div>

       <div className="fixed bottom-4 right-4 z-50">
         <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setShowAnnotations(!showAnnotations)}
            className="rounded-full h-12 w-12 shadow-lg bg-background"
         >
            <Highlighter className="h-5 w-5" />
         </Button>
       </div>

      <AnnotationManager
        annotations={annotations}
        isOpen={showAnnotations}
        onOpenChange={setShowAnnotations}
        onJumpTo={(cfi) => renditionRef.current?.display(cfi)}
        onDelete={deleteAnnotation}
        onUpdate={updateAnnotation}
      />
    </div>
  );
}
