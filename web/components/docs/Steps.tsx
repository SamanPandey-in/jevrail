import type { ReactNode } from "react";

export function Steps({ children }: { children: ReactNode }) {
  return <ol className="relative border-l border-border ml-3 space-y-10 my-8">{children}</ol>;
}

export function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <li className="relative pl-8">
      <span className="absolute -left-[13px] top-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold ring-4 ring-background">
        {number}
      </span>
      <h3 className="text-base font-bold text-foreground mb-2">{title}</h3>
      <div className="text-[15px] text-muted-foreground leading-relaxed [&>*:last-child]:mb-0">{children}</div>
    </li>
  );
}
