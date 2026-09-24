"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TabItem = {
  value: string;
  label: string;
  content: ReactNode;
};

// A small, dependency-free tab switcher styled after the "npm / pnpm /
  // yarn / bun" pickers on package doc sites. Deliberately not radix's Tabs.
// this needs zero extra JS for something this simple, and it keeps its own
// state so multiple instances on one page (e.g. install method + per-agent
// setup) don't interfere with each other.
export function Tabs({
  items,
  defaultValue,
  centerTabs = false,
}: {
  items: TabItem[];
  defaultValue?: string;
  /** Center the tab-picker pill itself (e.g. in a centered hero) instead of left-aligning it. */
  centerTabs?: boolean;
}) {
  const [active, setActive] = useState(defaultValue ?? items[0]?.value);
  const activeItem = items.find((i) => i.value === active) ?? items[0];

  return (
    <div className="w-full">
      <div className={cn("flex mb-4", centerTabs && "justify-center")}>
        <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary/30 p-1">
          {items.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setActive(item.value)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md transition-colors font-medium",
                item.value === activeItem?.value
                  ? "bg-background text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div>{activeItem?.content}</div>
    </div>
  );
}
