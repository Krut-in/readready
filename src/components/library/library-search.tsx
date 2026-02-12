"use client";

import { useState } from "react";
import { Search, ExternalLink, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { MetadataResult } from "@/lib/library/types";

type LibrarySearchProps = {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onAddFromMetadata: (result: MetadataResult) => void;
};

export function LibrarySearch({ searchTerm, onSearchTermChange, onAddFromMetadata }: LibrarySearchProps) {
  const [metadataResults, setMetadataResults] = useState<MetadataResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  async function handleExternalSearch() {
    if (!searchTerm.trim()) return;

    setSearching(true);
    setSearchError(null);
    setShowResults(true);

    try {
      const res = await fetch(`/api/library/metadata-search?q=${encodeURIComponent(searchTerm.trim())}`);
      const data = await res.json();

      if (data.ok) {
        setMetadataResults(data.results);
      } else {
        setSearchError(data.message ?? "Search failed.");
        setMetadataResults([]);
      }
    } catch {
      setSearchError("Network error. Please try again.");
      setMetadataResults([]);
    } finally {
      setSearching(false);
    }
  }

  const goodreadsUrl = searchTerm.trim()
    ? `https://www.goodreads.com/search?q=${encodeURIComponent(searchTerm.trim())}`
    : null;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              onSearchTermChange(e.target.value);
              setShowResults(false);
            }}
            placeholder="Search your library..."
            className="w-full rounded-full border border-border bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleExternalSearch}
          disabled={!searchTerm.trim() || searching}
          className="shrink-0"
        >
          {searching ? <Loader2 className="size-4 animate-spin" /> : "Search catalog"}
        </Button>
        {goodreadsUrl && (
          <a
            href={goodreadsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            Goodreads <ExternalLink className="size-3" />
          </a>
        )}
      </div>

      {/* External results */}
      {showResults && (
        <div className="space-y-2">
          {searchError && (
            <p className="text-xs text-destructive">{searchError}</p>
          )}
          {metadataResults.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Catalog results ({metadataResults.length})
              </p>
              <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-border/60 bg-surface/50 p-2">
                {metadataResults.map((r, i) => (
                  <button
                    key={`${r.sourceLabel}-${r.sourceId}-${i}`}
                    onClick={() => {
                      onAddFromMetadata(r);
                      setShowResults(false);
                      setMetadataResults([]);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-accent"
                  >
                    {r.coverUrl ? (
                      <img src={r.coverUrl} alt="" className="h-10 w-7 rounded object-cover" />
                    ) : (
                      <div className="flex h-10 w-7 items-center justify-center rounded bg-secondary text-[8px] text-muted-foreground">
                        N/A
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{r.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {r.author ?? "Unknown author"} · {r.sourceLabel === "google_books" ? "Google Books" : "Open Library"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {!searching && !searchError && metadataResults.length === 0 && (
            <p className="text-xs text-muted-foreground">No results found in external catalogs.</p>
          )}
        </div>
      )}
    </div>
  );
}
