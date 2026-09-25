import posthog from "posthog-js";

// Every custom event the site reports. Keep this list in sync with the
// call sites — it's the contract with whatever insights get built on top.
//
// Page views ("$pageview") are autocaptured by PostHog itself and are not
// listed here; the events below are the things autocapture can't answer on
// its own:
//
//   github_star_clicked     the "Star on GitHub" CTA            (placement)
//   github_link_clicked     any other outbound GitHub link      (placement)
//   share_on_x_clicked      any "Share on X" button             (placement, variant)
//   install_command_copied  copied the install command          (method, surface)
//   install_method_selected switched the install-method tab     (method, surface)
//   nav_link_clicked        a header nav link                   (label, href)
//   code_copied             copied any other code block         (label, doc)
//   copy_page_clicked       copied a doc page as Markdown       (doc)
export type AnalyticsEvent =
  | "github_star_clicked"
  | "github_link_clicked"
  | "share_on_x_clicked"
  | "install_command_copied"
  | "install_method_selected"
  | "nav_link_clicked"
  | "code_copied"
  | "copy_page_clicked";

export type AnalyticsProps = Record<
  string,
  string | number | boolean | undefined
>;

// Client-only. PostHog is initialised in instrumentation-client.ts; this
// wrapper exists so call sites don't have to care whether it booted, whether
// the user opted out, or whether the clipboard write even succeeded.
export function track(
  event: AnalyticsEvent,
  props?: AnalyticsProps
): void {
  if (typeof window === "undefined") return;
  if (!posthog.__loaded) return;

  const payload: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value !== undefined) payload[key] = value;
  }

  posthog.capture(event, payload);
}
