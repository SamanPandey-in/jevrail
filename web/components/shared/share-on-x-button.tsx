"use client";

import { XIcon } from "@/components/shared/x-icon";
import { SITE_URL, X_HANDLE } from "@/lib/site";
import { cn } from "@/lib/utils";

type ShareOnXButtonProps = {
  /** The text to pre-fill in the X post composer. */
  text: string;
  className?: string;
  /** "button" (solid pill) or "link" (plain text link, e.g. inline in docs footer). */
  variant?: "button" | "link";
};

export function ShareOnXButton({ text, className, variant = "button" }: ShareOnXButtonProps) {
  const shareUrl = `https://x.com/intent/tweet?${new URLSearchParams({
    text: `${text}\n\n@typesafeai ${X_HANDLE}`,
    url: SITE_URL,
  })}`;

  if (variant === "link") {
    return (
      <a
        href={shareUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors",
          className
        )}
      >
        <XIcon className="w-3.5 h-3.5" />
        Share on X
      </a>
    );
  }

  return (
    <a
      href={shareUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-secondary/40 hover:bg-secondary/70 text-sm font-medium text-foreground transition-colors",
        className
      )}
    >
      <XIcon className="w-4 h-4" />
      Share on X
    </a>
  );
}
