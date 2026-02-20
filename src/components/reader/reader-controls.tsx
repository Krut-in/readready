"use client";

import * as React from "react";
import {
  AlignJustify,
  ArrowLeft,
  Minus,
  Moon,
  Plus,
  Settings2,
  Sun,
  Flame,
  Eclipse,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { ThemeName, TocItem } from "./epub-reader";

interface ReaderControlsProps {
  fontSize: number;
  setFontSize: (size: number) => void;
  fontFamily: string;
  setFontFamily: (font: string) => void;
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  lineHeight: number;
  setLineHeight: (height: number) => void;
  toc: TocItem[];
  onChapterSelect: (href: string) => void;
  currentChapterLabel?: string | undefined;
  bookTitle?: string | undefined;
  progressPercent?: number | undefined;
}

const THEMES: { id: ThemeName; icon: React.ElementType; label: string }[] = [
  { id: "light", icon: Sun,     label: "Light" },
  { id: "dark",  icon: Moon,    label: "Dark"  },
  { id: "warm",  icon: Flame,   label: "Warm"  },
  { id: "night", icon: Eclipse, label: "Night" },
];

const FONTS: { id: string; label: string }[] = [
  { id: "Literata",  label: "Literata"  },
  { id: "Bookerly",  label: "Bookerly"  },
  { id: "Charter",   label: "Charter"   },
  { id: "Spectral",  label: "Spectral"  },
  { id: "system-ui", label: "System"    },
];

const LINE_HEIGHTS = [1.2, 1.5, 1.8, 2.0];

export function ReaderControls({
  fontSize,
  setFontSize,
  fontFamily,
  setFontFamily,
  theme,
  setTheme,
  lineHeight,
  setLineHeight,
  toc,
  onChapterSelect,
  currentChapterLabel,
  bookTitle,
  progressPercent = 0,
}: ReaderControlsProps) {
  const router = useRouter();

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300"
    >
      {/* Progress bar */}
      <div className="h-0.5 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-700"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-background/90 backdrop-blur-sm border-b">
        {/* Left: back + TOC + chapter label */}
        <div className="flex items-center gap-1 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => router.back()}
            aria-label="Back to library"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0" aria-label="Table of contents">
                <AlignJustify className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 sm:w-80 overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="text-base">{bookTitle ?? "Table of Contents"}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 flex flex-col gap-0.5">
                {toc.length === 0 && (
                  <p className="text-sm text-muted-foreground px-2">No chapters found.</p>
                )}
                {toc.map((item, i) => (
                  <Button
                    key={i}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "justify-start text-left font-normal truncate",
                      currentChapterLabel === item.label && "bg-accent font-medium",
                    )}
                    onClick={() => onChapterSelect(item.href)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </SheetContent>
          </Sheet>

          <div className="min-w-0 ml-1 hidden sm:block">
            {(bookTitle || currentChapterLabel) && (
              <p className="text-xs text-muted-foreground truncate max-w-[220px]">
                {currentChapterLabel
                  ? currentChapterLabel
                  : bookTitle}
              </p>
            )}
          </div>
        </div>

        {/* Right: typography settings */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Typography settings">
              <Settings2 className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 mr-3" align="end">
            <div className="space-y-4">

              {/* Theme */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Theme</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTheme(t.id)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-md py-2 px-1 text-[10px] border transition-colors",
                        theme === t.id
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border hover:bg-muted",
                      )}
                    >
                      <t.icon className="h-4 w-4" />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Font size */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Font Size</p>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setFontSize(Math.max(12, fontSize - 1))}
                    aria-label="Decrease font size"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="flex-1 text-center text-sm font-medium tabular-nums">{fontSize}px</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setFontSize(Math.min(32, fontSize + 1))}
                    aria-label="Increase font size"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Typeface */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Typeface</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {FONTS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFontFamily(f.id)}
                      className={cn(
                        "rounded-md py-1.5 px-2 text-sm border text-left transition-colors",
                        fontFamily === f.id
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border hover:bg-muted",
                      )}
                      style={{ fontFamily: f.id }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Line height */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Line Height</p>
                <div className="flex gap-1.5">
                  {LINE_HEIGHTS.map((lh) => (
                    <button
                      key={lh}
                      type="button"
                      onClick={() => setLineHeight(lh)}
                      className={cn(
                        "flex-1 rounded-md py-1.5 text-xs border transition-colors",
                        lineHeight === lh
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border hover:bg-muted",
                      )}
                    >
                      {lh}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
