"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus } from "lucide-react";
import { AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { BookCard } from "@/components/library/book-card";
import { BookFormDialog } from "@/components/library/book-form-dialog";
import { StateFilter } from "@/components/library/state-filter";
import { LibrarySearch } from "@/components/library/library-search";
import { ImportPanel } from "@/components/library/import-panel";
import type { Book, ReadingState, CreateBookInput, UpdateBookInput, MetadataResult } from "@/lib/library/types";

export default function LibraryPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [stateFilter, setStateFilter] = useState<ReadingState | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  // ── Fetch books ───────────────────────────────────────────────────────

  const fetchBooks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (stateFilter !== "all") params.set("state", stateFilter);
      const res = await fetch(`/api/library/books?${params.toString()}`);
      const data = await res.json();
      if (data.ok) setBooks(data.books);
    } catch {
      // Silently fail — books stay empty
    } finally {
      setLoading(false);
    }
  }, [stateFilter]);

  useEffect(() => {
    setLoading(true);
    fetchBooks();
  }, [fetchBooks]);

  // ── Local-first search filtering ──────────────────────────────────────

  const filteredBooks = useMemo(() => {
    if (!searchTerm.trim()) return books;
    const term = searchTerm.toLowerCase();
    return books.filter(
      (b) =>
        b.title.toLowerCase().includes(term) ||
        (b.author && b.author.toLowerCase().includes(term)),
    );
  }, [books, searchTerm]);

  // ── CRUD handlers ─────────────────────────────────────────────────────

  async function handleCreate(input: CreateBookInput | UpdateBookInput) {
    try {
      const res = await fetch("/api/library/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (data.ok) {
        setShowForm(false);
        fetchBooks();
      }
    } catch {
      // Network error — could add toast
    }
  }

  async function handleUpdate(input: CreateBookInput | UpdateBookInput) {
    if (!editingBook) return;
    try {
      const res = await fetch(`/api/library/books/${editingBook.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (data.ok) {
        setEditingBook(null);
        fetchBooks();
      }
    } catch {
      // Network error
    }
  }

  async function handleDelete(book: Book) {
    if (!confirm(`Delete "${book.title}"?`)) return;
    try {
      const res = await fetch(`/api/library/books/${book.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) fetchBooks();
    } catch {
      // Network error
    }
  }

  async function handleAddFromMetadata(result: MetadataResult) {
    const input: CreateBookInput = {
      title: result.title,
      author: result.author ?? undefined,
      state: "to_read",
      coverUrl: result.coverUrl ?? undefined,
      googleBooksId: result.sourceLabel === "google_books" ? result.sourceId : undefined,
      openLibraryKey: result.sourceLabel === "open_library" ? result.sourceId : undefined,
    };
    await handleCreate(input);
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold">Library</h1>
          <p className="text-sm text-muted-foreground">
            Manage your books, track reading states, and discover new titles.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="shrink-0 gap-2">
          <Plus className="size-4" />
          Add Book
        </Button>
      </header>

      {/* Search + state filter */}
      <div className="space-y-3">
        <LibrarySearch
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          onAddFromMetadata={handleAddFromMetadata}
        />
        <StateFilter active={stateFilter} onChange={setStateFilter} />
      </div>

      {/* Book grid */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading library…</p>
      ) : filteredBooks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {searchTerm ? "No matching books found." : "Your library is empty. Add your first book!"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filteredBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onEdit={(b) => setEditingBook(b)}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Import panel */}
      <ImportPanel onImportComplete={fetchBooks} />

      {/* Form dialog */}
      {showForm && (
        <BookFormDialog onSubmit={handleCreate} onClose={() => setShowForm(false)} />
      )}
      {editingBook && (
        <BookFormDialog
          book={editingBook}
          onSubmit={handleUpdate}
          onClose={() => setEditingBook(null)}
        />
      )}
    </div>
  );
}
