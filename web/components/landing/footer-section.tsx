"use client";

import Image from "next/image";
import Link from "next/link";
import { GithubIcon as Github } from "@/components/shared/github-icon";
import { ShareOnXButton } from "@/components/shared/share-on-x-button";
import { XIcon } from "@/components/shared/x-icon";
import { GITHUB_URL, TEMPLATE_CREDIT, X_URL } from "@/lib/site";

const footerLinks = {
  Explore: [
    { name: "Platform", href: "#features" },
    { name: "Docs", href: "/docs" },
    { name: "GitHub", href: GITHUB_URL },
  ],
  Resources: [
    { name: "Installation", href: "/docs/installation" },
    { name: "How it works", href: "/docs/how-it-works" },
    { name: "Configuration", href: "/docs#configuration" },
    { name: "Roadmap", href: "/docs/roadmap" },
  ],
  Legal: [
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms", href: "/terms" },
    { name: "Contact", href: "/contact" },
  ],
};

export function FooterSection() {
  return (
    <footer className="relative border-t border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Main Footer */}
        <div className="py-16">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
            {/* Brand Column */}
            <div className="col-span-2">
              <a href="/" className="flex items-center gap-2 mb-6">
                <Image
                  src="/dark-icon.svg"
                  alt=""
                  width={32}
                  height={32}
                  className="w-8 h-8"
                />
                <span className="font-semibold text-lg tracking-tight">JevRail</span>
              </a>

              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                A probability-scored pre-execution guard for terminal coding agents.
              </p>
              <p className="text-xs font-mono text-primary/80 mb-6">
                powered by Jev (typesafe.ai)
              </p>

              {/* Social Links */}
              <div className="flex items-center gap-3">
                <a
                  href={X_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="X"
                >
                  <XIcon className="w-5 h-5" />
                </a>
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="GitHub"
                >
                  <Github className="w-5 h-5" />
                </a>
                <ShareOnXButton
                  text="A probability-scored pre-execution guard for terminal coding agents: JevRail. Check it out!"
                  className="ml-1"
                />
              </div>
            </div>

            {/* Link Columns */}
            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title}>
                <h3 className="text-sm font-medium mb-4">{title}</h3>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            2026 JevRail. Open source under MIT.
          </p>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              All systems operational
            </span>
          </div>
        </div>

        {/* Template credit */}
        <div className="py-4 border-t border-border">
          <p className="text-xs text-muted-foreground/70 text-center">
            Landing page template by{" "}
            <a
              href={TEMPLATE_CREDIT.portfolioUrl}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              {TEMPLATE_CREDIT.name}
            </a>{" "}
            via v0 —{" "}
            <a
              href={TEMPLATE_CREDIT.portfolioUrl}
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground underline underline-offset-2 transition-colors"
            >
              {TEMPLATE_CREDIT.portfolioUrl.replace("https://", "")}
            </a>{" "}
            ·{" "}
            <a
              href={TEMPLATE_CREDIT.xUrl}
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground underline underline-offset-2 transition-colors"
            >
              {TEMPLATE_CREDIT.xHandle}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
