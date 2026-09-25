"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { track, type AnalyticsEvent, type AnalyticsProps } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type CodeBlockProps = {
  code: string;
  /** Small label shown top-left, e.g. a language tag or "Terminal". */
  label?: string;
  className?: string;
  /**
   * Event fired when the code is copied. Defaults to `code_copied`; the
   * install command block overrides it with `install_command_copied` so the
   * top-of-funnel copies can be pulled out on their own.
   */
  event?: AnalyticsEvent;
  /** Extra properties merged into the copy event, e.g. `{ surface: "hero" }`. */
  trackData?: AnalyticsProps;
};

  // A plain, dependency-free code block with a copy button. Used both by
  // the markdown renderer (every fenced code block in the docs gets one for
  // free) and directly by hand-built pages like Installation.
export function CodeBlock({
  code,
  label,
  className,
  event = "code_copied",
  trackData,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      track(event, { label, ...trackData });
    } catch {
      // Clipboard API unavailable (e.g. insecure context). Fail silently,
      // the code is still selectable and copyable by hand.
    }
  };

  return (
    <div className={cn("group relative rounded-xl border border-border bg-card overflow-hidden", className)}>
      {label && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary/30">
          <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
        </div>
      )}
      <div className="relative">
        <pre className="overflow-x-auto p-4 text-[13px] font-mono leading-relaxed text-foreground/90">
          <code>{code}</code>
        </pre>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy to clipboard"
          className={cn(
            "absolute top-2.5 right-2.5 flex items-center justify-center w-7 h-7 rounded-md border border-border bg-background/80 backdrop-blur-sm text-muted-foreground transition-all",
            "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-foreground hover:bg-secondary",
            copied && "opacity-100 text-primary"
          )}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
