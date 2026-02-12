"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { READING_STATES, READING_STATE_LABELS, type ReadingState, type CreateBookInput, type UpdateBookInput } from "@/lib/library/types";
import type { Book } from "@/lib/library/types";

type BookFormDialogProps = {
  book?: Book | null;
  onSubmit: (data: CreateBookInput | UpdateBookInput) => void;
  onClose: () => void;
};

export function BookFormDialog({ book, onSubmit, onClose }: BookFormDialogProps) {
  const isEdit = Boolean(book);
  const [title, setTitle] = useState(book?.title ?? "");
  const [author, setAuthor] = useState(book?.author ?? "");
  const [state, setState] = useState<ReadingState>(book?.state ?? "to_read");
  const [coverUrl, setCoverUrl] = useState(book?.coverUrl ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    if (isEdit) {
      const payload: UpdateBookInput = {};
      if (title.trim() !== book?.title) payload.title = title.trim();
      if (author.trim() !== (book?.author ?? "")) payload.author = author.trim() || null;
      if (state !== book?.state) payload.state = state;
      if (coverUrl.trim() !== (book?.coverUrl ?? "")) payload.coverUrl = coverUrl.trim() || null;
      onSubmit(payload);
    } else {
      onSubmit({
        title: title.trim(),
        author: author.trim() || undefined,
        state,
        coverUrl: coverUrl.trim() || undefined,
      } as CreateBookInput);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <Card className="w-full max-w-md space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{isEdit ? "Edit Book" : "Add Book"}</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-accent">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="book-title" className="text-xs font-medium text-muted-foreground">
              Title *
            </label>
            <input
              id="book-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Enter book title"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="book-author" className="text-xs font-medium text-muted-foreground">
              Author
            </label>
            <input
              id="book-author"
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Enter author name"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="book-state" className="text-xs font-medium text-muted-foreground">
              Reading State
            </label>
            <select
              id="book-state"
              value={state}
              onChange={(e) => setState(e.target.value as ReadingState)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {READING_STATES.map((s) => (
                <option key={s} value={s}>
                  {READING_STATE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="book-cover" className="text-xs font-medium text-muted-foreground">
              Cover URL
            </label>
            <input
              id="book-cover"
              type="url"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="https://..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{isEdit ? "Save Changes" : "Add Book"}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
