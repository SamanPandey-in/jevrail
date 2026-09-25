import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, KeyRound, Terminal, Wrench } from "lucide-react";
import { docsManifest, getDocBySlug } from "@/lib/docs/docs-manifest";
import { getDocSourceText } from "@/lib/docs/docs-content";
import { extractHeadings } from "@/lib/docs/docs-headings";
import { extractDocDescription } from "@/lib/docs/docs-excerpt";
import { SITE_URL } from "@/lib/site";
import { CopyPageButton } from "@/components/docs/CopyPageButton";
import { OnThisPage } from "@/components/docs/OnThisPage";
import { Progress } from "@/components/docs/Progress";
import { ShareOnXButton } from "@/components/shared/share-on-x-button";
import { InstallTabs } from "@/components/docs/InstallTabs";
import { AgentTabs } from "@/components/docs/AgentTabs";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { Callout } from "@/components/docs/Callout";
import { Steps, Step } from "@/components/docs/Steps";

const ENTRY = getDocBySlug("installation")!;

export async function generateMetadata(): Promise<Metadata> {
  const source = getDocSourceText(ENTRY);
  const description = extractDocDescription(source) ?? undefined;
  const url = `${SITE_URL}/docs/installation`;

  return {
    title: { absolute: `${ENTRY.title} | JevRail Docs` },
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${ENTRY.title} | JevRail Docs`,
      description,
      url,
      type: "article",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: ENTRY.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${ENTRY.title} | JevRail Docs`,
      description,
      images: ["/og.png"],
    },
  };
}

const DOCTOR_OUTPUT = `Jevrail doctor

✓ config:      loaded (model = jev-1.13.0, base_url = https://api.typesafe.ai)
✓ api key:     present
✓ api reach:   https://api.typesafe.ai reachable
✓ claude hook: installed in /home/u/.claude/settings.json

Smoke test (no-model fast paths):
  "git status"       → allow (tier0)
  "rm -rf /"         → deny (tier0)
  "echo hi"          → allow (tier0)`;

export default function InstallationPage() {
  const source = getDocSourceText(ENTRY);
  const headings = extractHeadings(source);
  const progressSections = headings.map((h) => ({ id: h.id, label: h.label }));

  const index = docsManifest.findIndex((d) => d.slug === "installation");
  const prev = docsManifest[index - 1];
  const next = docsManifest[index + 1];

  // Headings are pulled straight from INSTALLATION.md so the ids used
  // below (headings[0].id, headings[1].id, ...) always match what
  // OnThisPage / Progress / the "copy page" markdown expect. If the doc
  // source's heading order ever changes, update the indices to match.
  const h = headings;

  return (
    <div>
      <div className="flex justify-end mb-6">
        <CopyPageButton source={source} slug={ENTRY.slug} />
      </div>

      <div className="flex gap-12">
        <article className="flex-1 min-w-0 max-w-3xl docs-prose">
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mt-0 mb-3">Installation</h1>
          <p className="text-muted-foreground leading-relaxed mb-8 text-[15px]">
            Get jevrail installed, configured, and wired into your coding agent: five commands, no daemon, no shell wrapper.
          </p>

          <div className="flex flex-wrap gap-3 mb-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-secondary/40 text-xs text-muted-foreground">
              <Terminal className="w-3 h-3" /> Go 1.22+
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-secondary/40 text-xs text-muted-foreground">
              <KeyRound className="w-3 h-3" /> Jev API key (optional)
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-secondary/40 text-xs text-muted-foreground">
              <Wrench className="w-3 h-3" /> Claude Code / opencode / Codex
            </span>
          </div>

          <h2 id={h[0].id} className="text-2xl font-bold text-foreground mt-12 mb-4 pb-2 border-b border-border scroll-mt-24">
            {h[0].label}
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-2 text-[15px]">Before you install, you&apos;ll want:</p>
          <ul className="list-disc list-outside pl-6 mb-5 text-muted-foreground space-y-2 text-[15px]">
            <li>Go 1.22 or newer</li>
            <li>
              A Jev API key (
              <a href="https://typesafe.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 underline underline-offset-2">
                early access is waitlisted
              </a>
              ). Or skip this and run fully offline in deterministic-only mode
            </li>
            <li>Claude Code, opencode, or Codex, if you want the hook wired in automatically</li>
          </ul>

          <h2 id={h[1].id} className="text-2xl font-bold text-foreground mt-12 mb-4 pb-2 border-b border-border scroll-mt-24">
            {h[1].label}
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4 text-[15px]">
            Pick whichever fits: a direct install for a quick try, or a source checkout while jevrail is still pre-release.
          </p>
          <InstallTabs surface="installation_doc" />
          <p className="text-muted-foreground leading-relaxed mt-4 text-[15px]">
            Either way, the binary lands in <code className="bg-secondary/60 border border-border text-primary rounded px-1.5 py-0.5 text-[13px] font-mono">$GOPATH/bin</code>{" "}
            or <code className="bg-secondary/60 border border-border text-primary rounded px-1.5 py-0.5 text-[13px] font-mono">$HOME/go/bin</code>. Make sure that&apos;s on your <code className="bg-secondary/60 border border-border text-primary rounded px-1.5 py-0.5 text-[13px] font-mono">PATH</code>.
          </p>

          <h2 id={h[2].id} className="text-2xl font-bold text-foreground mt-12 mb-4 pb-2 border-b border-border scroll-mt-24">
            {h[2].label}
          </h2>
          <CodeBlock code="jevrail configure" label="Terminal" className="mb-4" />
          <p className="text-muted-foreground leading-relaxed mb-4 text-[15px]">
            Prompts interactively and saves the key to <code className="bg-secondary/60 border border-border text-primary rounded px-1.5 py-0.5 text-[13px] font-mono">~/.config/jevrail/config.json</code>{" "}
            with <code className="bg-secondary/60 border border-border text-primary rounded px-1.5 py-0.5 text-[13px] font-mono">0600</code> permissions. Every other command reuses it.
          </p>
          <CodeBlock code={'jevrail configure --key "sk-jev-..."'} label="Non-interactive / CI" className="mb-4" />
          <CodeBlock code={'export TYPESAFE_API_KEY="sk-jev-..."'} label="Env var (always wins if set)" className="mb-4" />
          <Callout variant="info" title="No key yet?">
            Set <code className="text-primary">&quot;no_model&quot;: true</code> in the config and jevrail runs in deterministic-only mode. Nothing leaves your machine. See{" "}
            <Link href="/docs/privacy" className="text-primary underline underline-offset-2">Privacy</Link> for the full data-flow breakdown.
          </Callout>

          <h2 id={h[3].id} className="text-2xl font-bold text-foreground mt-12 mb-4 pb-2 border-b border-border scroll-mt-24">
            {h[3].label}
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4 text-[15px]">
            Pick your agent. Each installs a slightly different hook.
          </p>
          <AgentTabs />

          <h2 id={h[4].id} className="text-2xl font-bold text-foreground mt-12 mb-4 pb-2 border-b border-border scroll-mt-24">
            {h[4].label}
          </h2>
          <CodeBlock code="jevrail doctor" label="Terminal" className="mb-4" />
          <CodeBlock code={DOCTOR_OUTPUT} label="Expected output" className="mb-4" />
          <p className="text-muted-foreground leading-relaxed text-[15px]">
            Checks that config loads, the model is pinned (warns on <code className="bg-secondary/60 border border-border text-primary rounded px-1.5 py-0.5 text-[13px] font-mono">jev-latest</code>), the timeout sits in the 500–5000ms range, the key is present, the base URL is reachable, and the hook is installed. It never prints the key itself.
          </p>

          <h2 id={h[5].id} className="text-2xl font-bold text-foreground mt-12 mb-4 pb-2 border-b border-border scroll-mt-24">
            {h[5].label}
          </h2>
          <CodeBlock code='jevrail explain "rm -rf ./dist"' label="Terminal" className="mb-4" />
          <p className="text-muted-foreground leading-relaxed mb-6 text-[15px]">
            Runs any command through the full pipeline and prints every probability, the context that was sent, and the
            verdict without actually running the command. Good first thing to try after install.
          </p>

          <Callout variant="success" title="You're set">
            From here, every <code className="text-primary">Bash</code> tool call from Claude Code or opencode is
            evaluated before it runs. No shell wrapper, no daemon required.
          </Callout>

          <h2 id={h[6].id} className="text-2xl font-bold text-foreground mt-12 mb-4 pb-2 border-b border-border scroll-mt-24">
            {h[6].label}
          </h2>
          <CodeBlock
            code={`jevrail uninstall --agent claude\njevrail uninstall --agent opencode\njevrail uninstall --agent opencode --project`}
            label="Terminal"
            className="mb-4"
          />
          <p className="text-muted-foreground leading-relaxed text-[15px]">
            Removes the hook and restores your previous settings from the backup jevrail made on install.
          </p>

          <h2 id={h[7].id} className="text-2xl font-bold text-foreground mt-12 mb-4 pb-2 border-b border-border scroll-mt-24">
            {h[7].label}
          </h2>
          <Steps>
            <Step number={1} title="jevrail: command not found">
              <p>
                Your Go bin directory isn&apos;t on <code className="text-primary">PATH</code>. Run{" "}
                <code className="text-primary">go env GOPATH</code> and add <code className="text-primary">$GOPATH/bin</code>{" "}
                (or <code className="text-primary">$HOME/go/bin</code>) to your shell profile.
              </p>
            </Step>
            <Step number={2} title="doctor reports the API unreachable">
              <p>
                Check <code className="text-primary">base_url</code> in{" "}
                <code className="text-primary">~/.config/jevrail/config.json</code>, and confirm outbound HTTPS isn&apos;t
                blocked on your network.
              </p>
            </Step>
            <Step number={3} title="Hook isn't firing">
              <p>
                Restart your agent after install (opencode in particular only loads plugins at startup), then re-run{" "}
                <code className="text-primary">jevrail doctor</code> to confirm it&apos;s still registered.
              </p>
            </Step>
            <Step number={4} title="Too many ask prompts">
              <p>
                The default bands are conservative starting guesses. Tune <code className="text-primary">bands</code> in
                the config. See <Link href="/docs/decisions" className="text-primary underline underline-offset-2">Decisions</Link>{" "}
                for how probabilities map to verdicts.
              </p>
            </Step>
          </Steps>

          <h2 id={h[8].id} className="text-2xl font-bold text-foreground mt-12 mb-4 pb-2 border-b border-border scroll-mt-24">
            {h[8].label}
          </h2>
          <ul className="list-disc list-outside pl-6 mb-8 text-muted-foreground space-y-2 text-[15px]">
            <li>
              <Link href="/docs/how-it-works" className="text-primary hover:text-primary/80 underline underline-offset-2">How It Works</Link>: the pipeline and the &quot;model can only tighten&quot; rule
            </li>
            <li>
              <Link href="/docs/usage" className="text-primary hover:text-primary/80 underline underline-offset-2">Usage Guide</Link>: full worked examples for every command
            </li>
            <li>
              <Link href="/docs#configuration" className="text-primary hover:text-primary/80 underline underline-offset-2">Configuration</Link>: every config field, explained
            </li>
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-6 border-t border-border">
            <ShareOnXButton
              text="Got JevRail installed and guarding my coding agent in under 5 minutes."
              variant="link"
              placement="installation_doc"
            />
          </div>

          <div className="flex items-center justify-between gap-4 mt-6 pt-8 border-t border-border">
            {prev ? (
              <Link
                href={prev.slug ? `/docs/${prev.slug}` : "/docs"}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-card/60 hover:border-primary/40 transition-colors text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span>
                  <span className="block text-xs text-muted-foreground/70">Previous</span>
                  {prev.title}
                </span>
              </Link>
            ) : (
              <div />
            )}
            {next ? (
              <Link
                href={next.slug ? `/docs/${next.slug}` : "/docs"}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-card/60 hover:border-primary/40 transition-colors text-sm text-muted-foreground hover:text-foreground text-right ml-auto"
              >
                <span>
                  <span className="block text-xs text-muted-foreground/70">Next</span>
                  {next.title}
                </span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </Link>
            ) : (
              <div />
            )}
          </div>
        </article>

        <aside className="hidden xl:block w-56 shrink-0">
          <div className="sticky top-32">
            <OnThisPage headings={headings} />
          </div>
        </aside>
      </div>

      <Progress sections={progressSections} />
    </div>
  );
}
