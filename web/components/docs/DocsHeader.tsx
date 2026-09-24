"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GithubIcon as Github } from "@/components/shared/github-icon";
import { DocsSidebar } from "./DocsSidebar";
import { DocsSearch } from "./DocsSearch";
import { ShareOnXButton } from "@/components/shared/share-on-x-button";
import { GITHUB_URL } from "@/lib/site";
import type { DocSearchEntry } from "@/lib/docs/docs-search-index";

export function DocsHeader({ searchIndex }: { searchIndex: DocSearchEntry[] }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center gap-6">
        <div className="flex items-center gap-6 shrink-0">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/dark-icon.svg"
              alt=""
              width={28}
              height={28}
              className="w-7 h-7"
              priority
            />
            <span className="text-lg font-bold tracking-tight">JevRail</span>
          </Link>
          <span className="hidden md:inline-block text-sm text-muted-foreground/60">/</span>
          <span className="hidden md:inline-block text-sm text-muted-foreground">Docs</span>
        </div>

        <div className="hidden md:flex flex-1 justify-center">
          <div className="w-full max-w-xs">
            <DocsSearch index={searchIndex} />
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3 shrink-0">
          <ShareOnXButton
            text="Just found JevRail: a probability-scored pre-execution guard for terminal coding agents."
            variant="link"
          />
          <Button asChild size="sm" variant="outline">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer">
              <Github className="w-4 h-4 mr-2" />
              GitHub
            </a>
          </Button>
        </div>

        <button className="md:hidden ml-auto text-muted-foreground hover:text-foreground" onClick={() => setMobileNavOpen(!mobileNavOpen)}>
          {mobileNavOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {mobileNavOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-lg px-6 py-6 max-h-[75vh] overflow-y-auto">
          <div className="mb-6">
            <DocsSearch index={searchIndex} />
          </div>
          <DocsSidebar onNavigate={() => setMobileNavOpen(false)} />
          <div className="h-[1px] bg-border my-6" />
          <div className="flex flex-col gap-3">
            <Button asChild variant="outline">
              <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                <Github className="w-4 h-4 mr-2" />
                GitHub
              </a>
            </Button>
            <ShareOnXButton
              text="Just found JevRail: a probability-scored pre-execution guard for terminal coding agents."
              className="w-full justify-center"
            />
          </div>
        </div>
      )}
    </header>
  );
}
