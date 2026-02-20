"use client";

import * as React from "react";
import { Trash2, Edit2, BookMarked } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { AnnotationColor } from "./epub-reader";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Annotation {
  id: string;
  cfiRange: string;
  text: string;
  note?: string | undefined;
  color: AnnotationColor;
  createdAt: string;
}

interface AnnotationManagerProps {
  annotations: Annotation[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onJumpTo: (cfi: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, note: string) => void;
  /** ID of annotation to auto-focus and enter edit mode */
  focusedId?: string | null;
  /** Called after focused annotation has been handled */
  onFocusedHandled?: () => void;
}

// ── Colour mappings ────────────────────────────────────────────────────────────

const BORDER_COLOR: Record<AnnotationColor, string> = {
  yellow: "border-yellow-400",
  red: "border-red-400",
  green: "border-green-400",
  blue: "border-blue-400",
};

const SWATCH_COLOR: Record<AnnotationColor, string> = {
  yellow: "bg-yellow-300",
  red: "bg-red-400",
  green: "bg-green-400",
  blue: "bg-blue-400",
};

// ── Component ─────────────────────────────────────────────────────────────────

export function AnnotationManager({
  annotations,
  isOpen,
  onOpenChange,
  onJumpTo,
  onDelete,
  onUpdate,
  focusedId,
  onFocusedHandled,
}: AnnotationManagerProps) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState("");
  const focusedRef = React.useRef<HTMLDivElement>(null);

  // When focusedId changes, enter edit mode for that annotation
  React.useEffect(() => {
    if (!focusedId) return;
    const ann = annotations.find((a) => a.id === focusedId);
    if (ann) {
      setEditingId(ann.id);
      setEditValue(ann.note ?? "");
      // Scroll to the card once the Sheet animation has settled
      const t = setTimeout(() => {
        focusedRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 320);
      onFocusedHandled?.();
      return () => clearTimeout(t);
    }
  }, [focusedId, annotations, onFocusedHandled]);

  const handleSave = (id: string) => {
    onUpdate(id, editValue);
    setEditingId(null);
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleEditStart = (ann: Annotation) => {
    setEditingId(ann.id);
    setEditValue(ann.note ?? "");
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[320px] sm:w-[380px] flex flex-col p-0"
      >
        <SheetHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <BookMarked className="h-4 w-4 text-muted-foreground" />
            Annotations
            {annotations.length > 0 && (
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                {annotations.length}{" "}
                {annotations.length === 1 ? "note" : "notes"}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {annotations.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <BookMarked className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No annotations yet.
              </p>
              <p className="text-xs text-muted-foreground/70">
                Select any text while reading to highlight and add notes.
              </p>
            </div>
          ) : (
            annotations.map((ann) => (
              <AnnotationCard
                key={ann.id}
                ann={ann}
                isEditing={editingId === ann.id}
                editValue={editValue}
                isFocused={focusedId === ann.id}
                focusedRef={focusedId === ann.id ? focusedRef : undefined}
                onJumpTo={() => onJumpTo(ann.cfiRange)}
                onEditStart={() => handleEditStart(ann)}
                onEditValueChange={setEditValue}
                onSave={() => handleSave(ann.id)}
                onCancel={handleCancel}
                onDelete={() => onDelete(ann.id)}
              />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Annotation Card ────────────────────────────────────────────────────────────

interface AnnotationCardProps {
  ann: Annotation;
  isEditing: boolean;
  editValue: string;
  isFocused: boolean;
  focusedRef?: React.Ref<HTMLDivElement> | undefined;
  onJumpTo: () => void;
  onEditStart: () => void;
  onEditValueChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

function AnnotationCard({
  ann,
  isEditing,
  editValue,
  isFocused,
  focusedRef,
  onJumpTo,
  onEditStart,
  onEditValueChange,
  onSave,
  onCancel,
  onDelete,
}: AnnotationCardProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Focus textarea when entering edit mode
  React.useEffect(() => {
    if (isEditing) {
      const t = setTimeout(() => textareaRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isEditing]);

  return (
    <div
      ref={focusedRef}
      id={`ann-${ann.id}`}
      className={cn(
        "rounded-lg border-l-4 bg-muted/30 transition-colors",
        BORDER_COLOR[ann.color],
        isFocused && "ring-1 ring-primary/30",
      )}
    >
      {/* Header: colour swatch + date + actions */}
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
        <span
          className={cn(
            "w-2.5 h-2.5 rounded-full shrink-0",
            SWATCH_COLOR[ann.color],
          )}
          aria-label={`${ann.color} highlight`}
        />
        <span className="text-[10px] text-muted-foreground flex-1">
          {new Date(ann.createdAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </span>
        {!isEditing && (
          <div className="flex items-center gap-0.5">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              aria-label="Edit note"
              onClick={(e) => {
                e.stopPropagation();
                onEditStart();
              }}
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 hover:text-destructive"
              aria-label="Delete annotation"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Highlighted text excerpt — click to jump */}
      <button
        type="button"
        className="w-full text-left px-3 pb-2"
        onClick={onJumpTo}
        aria-label="Jump to this passage"
      >
        <blockquote className="text-xs italic text-muted-foreground border-l-2 border-muted-foreground/30 pl-2 line-clamp-3 hover:line-clamp-none transition-all">
          &ldquo;{ann.text}&rdquo;
        </blockquote>
      </button>

      {/* Note area */}
      {isEditing ? (
        <div
          className="px-3 pb-3 space-y-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => onEditValueChange(e.target.value)}
            placeholder="Add a note… (Markdown supported)"
            className="min-h-[90px] resize-none font-mono text-xs leading-relaxed"
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={onSave}>
              Save note
            </Button>
          </div>
        </div>
      ) : ann.note ? (
        <div
          className="px-3 pb-3 cursor-pointer"
          onClick={onEditStart}
          title="Click to edit"
        >
          <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {ann.note}
            </ReactMarkdown>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="w-full text-left px-3 pb-3"
          onClick={onEditStart}
        >
          <span className="text-xs text-muted-foreground/60 italic">
            + Add a note…
          </span>
        </button>
      )}
    </div>
  );
}
