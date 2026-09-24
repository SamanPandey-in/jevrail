const commands = [
  {
    command: "jevrail hook <claude|codex|opencode>",
    purpose: "Hook target: reads agent JSON on stdin, writes a decision (exit 2 = hard block).",
  },
  {
    command: "jevrail install / uninstall",
    purpose: "Idempotent hook setup for Claude Code or opencode, with automatic config backups.",
  },
  {
    command: 'jevrail explain "<cmd>"',
    purpose: "Shows every probability, context, and verdict for a command without running it.",
  },
  {
    command: "jevrail log [-n N]",
    purpose: "Prints the last N audit entries from the local jsonl audit log.",
  },
  {
    command: "jevrail eval <corpus.jsonl>",
    purpose: "Benchmarks recall, false-ask rate, tier0 baseline, latency, and flip rate.",
  },
  {
    command: "jevrail exec -- <cmd>",
    purpose: "Guarded execution shim for hookless agents: prompts on ask, blocks on deny.",
  },
  {
    command: "jevrail doctor",
    purpose: "Checks config, API key, reachability, hook wiring, model pin, and timeout.",
  },
  {
    command: "jevrail configure [--key KEY]",
    purpose: "Stores the Jev API key once; hook, explain, eval, and exec all reuse it.",
  },
];

export function CommandsSection() {
  return (
    <section id="commands" className="relative py-24 lg:py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="mb-12 max-w-2xl">
          <p className="text-sm font-mono text-primary mb-3">// COMMANDS</p>
          <h2 className="text-3xl lg:text-5xl font-semibold tracking-tight mb-6">
            A small interface for safer execution.
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Install Jevrail once, then use focused commands to connect hooks, inspect decisions, and keep a clear audit trail.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border/70 bg-card/20 card-shadow">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <caption className="sr-only">Jevrail command reference</caption>
            <thead>
              <tr className="border-b border-border/70 text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
                <th scope="col" className="px-6 py-4 font-normal">Command</th>
                <th scope="col" className="px-6 py-4 font-normal">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {commands.map((item) => (
                <tr key={item.command} className="group transition-colors hover:bg-primary/[0.04]">
                  <th scope="row" className="px-6 py-5 align-top font-mono text-sm font-normal text-primary whitespace-nowrap">
                    {item.command}
                  </th>
                  <td className="px-6 py-5 text-sm leading-relaxed text-muted-foreground">
                    {item.purpose}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
