import Image from "next/image";
import Link from "next/link";

// Shared shell for /privacy, /terms, and /contact — same visual language
// as the rest of the marketing site, but a plain readable-width column
// instead of the docs sidebar layout, since these are standalone pages.
export function LegalLayout({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
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
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Back to home
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-2">{title}</h1>
        {lastUpdated && <p className="text-sm text-muted-foreground mb-12">Last updated: {lastUpdated}</p>}

        <div
          className="[&>h2]:text-xl [&>h2]:font-bold [&>h2]:mt-10 [&>h2]:mb-3 [&>h2]:first:mt-0
                        [&>p]:text-muted-foreground [&>p]:leading-relaxed [&>p]:mb-4 [&>p]:text-[15px]
                        [&>ul]:list-disc [&>ul]:list-outside [&>ul]:pl-6 [&>ul]:mb-4 [&>ul]:text-muted-foreground [&>ul]:space-y-1.5 [&>ul]:text-[15px]
                        [&_a]:text-primary [&_a]:hover:text-primary/80 [&_a]:underline [&_a]:underline-offset-2"
        >
          {children}
        </div>
      </main>

      <footer className="border-t border-border py-10 text-center text-xs text-muted-foreground">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6">
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          <span>
            Built by{" "}
            <a href="https://github.com/SamanPandey-in" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
              Saman Pandey
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
