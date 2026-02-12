"use client";

import { cn } from "@/lib/utils";
import { READING_STATE_LABELS, type ReadingState } from "@/lib/library/types";

type StateFilterProps = {
  active: ReadingState | "all";
  onChange: (state: ReadingState | "all") => void;
};

const FILTERS: Array<{ value: ReadingState | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "to_read", label: READING_STATE_LABELS.to_read },
  { value: "reading", label: READING_STATE_LABELS.reading },
  { value: "completed", label: READING_STATE_LABELS.completed },
];

export function StateFilter({ active, onChange }: StateFilterProps) {
  return (
    <div className="flex gap-1">
      {FILTERS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition",
            active === value
              ? "bg-primary text-primary-foreground"
              : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
