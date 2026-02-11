"use client";

import { useTheme, type ReadReadyTheme } from "@/components/theme/theme-provider";
import { cn } from "@/lib/utils";

const THEMES: ReadReadyTheme[] = ["light", "warm", "dark", "night"];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="inline-flex gap-1 rounded-full border border-border bg-card p-1 text-xs shadow-sm">
      {THEMES.map((choice) => {
        const active = theme === choice;

        return (
          <button
            key={choice}
            type="button"
            className={cn(
              "rounded-full px-3 py-1 font-medium capitalize transition",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setTheme(choice)}
          >
            {choice}
          </button>
        );
      })}
    </div>
  );
}
