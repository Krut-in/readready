"use client";

import * as React from "react";
import { 
  Settings, 
  Type, 
  Moon, 
  Sun, 
  Sunset,
  AlignJustify, 
  X,
  Minus,
  Plus
} from "lucide-react";
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

interface ReaderControlsProps {
  fontSize: number;
  setFontSize: (size: number) => void;
  fontFamily: string;
  setFontFamily: (font: string) => void;
  theme: string;
  setTheme: (theme: string) => void;
  lineHeight: number;
  setLineHeight: (height: number) => void;
  toc: any[]; // Table of contents
  onChapterSelect: (href: string) => void;
  currentChapterLabel?: string;
}

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
  currentChapterLabel
}: ReaderControlsProps) {

  const themes = [
    { id: "light", icon: Sun, label: "Light" },
    { id: "dark", icon: Moon, label: "Dark" },
    { id: "sepia", icon: Sunset, label: "Sepia" },
  ];

  const fonts = [
    { id: "Literata", label: "Literata" },
    { id: "Bookerly", label: "Bookerly" },
    { id: "Charter", label: "Charter" },
    { id: "Spectral", label: "Spectral" },
    { id: "system-ui", label: "System" },
  ];

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-background/80 backdrop-blur-sm transition-opacity duration-300 opacity-0 hover:opacity-100 focus-within:opacity-100">
      <div className="flex items-center gap-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <AlignJustify className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[400px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Table of Contents</SheetTitle>
            </SheetHeader>
            <div className="mt-4 flex flex-col gap-1">
              {toc.map((item, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  className="justify-start text-left font-normal truncate"
                  onClick={() => onChapterSelect(item.href)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
        <span className="text-sm font-medium opacity-50 truncate max-w-[200px]">
          {currentChapterLabel}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon">
              <Type className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 mr-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Theme</h4>
                <div className="flex gap-2">
                  {themes.map((t) => (
                    <Button
                      key={t.id}
                      variant={theme === t.id ? "default" : "outline"}
                      size="sm"
                      className="flex-1"
                      onClick={() => setTheme(t.id)}
                    >
                      <t.icon className="h-4 w-4 mr-2" />
                      {t.label}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Font Size</h4>
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setFontSize(Math.max(12, fontSize - 2))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="flex-1 text-center font-medium">{fontSize}px</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setFontSize(Math.min(32, fontSize + 2))}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Typeface</h4>
                <div className="grid grid-cols-2 gap-2">
                  {fonts.map((f) => (
                    <Button
                      key={f.id}
                      variant={fontFamily === f.id ? "default" : "ghost"}
                      size="sm"
                      className="justify-start"
                      onClick={() => setFontFamily(f.id)}
                      style={{ fontFamily: f.id }}
                    >
                      {f.label}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Line Height</h4>
                <div className="flex items-center gap-2">
                  {[1.2, 1.5, 1.8, 2.0].map((lh) => (
                    <Button
                      key={lh}
                      variant={lineHeight === lh ? "default" : "outline"}
                      size="sm"
                      className="flex-1"
                      onClick={() => setLineHeight(lh)}
                    >
                      {lh}
                    </Button>
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
