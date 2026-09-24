"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { GithubIcon as Github } from "@/components/shared/github-icon";

const navLinks = [
  { name: "Install", href: "/docs/installation" },
  { name: "Docs", href: "/docs" },
];
const githubUrl = "https://github.com/SamanPandey-in/jevrail"; 

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6 sm:pt-5">
      <nav
        className={`pointer-events-auto mx-auto max-w-5xl overflow-hidden rounded-2xl border transition-all duration-500 ease-out motion-reduce:transition-none ${
          isScrolled || isMobileMenuOpen
            ? "border-white/10 bg-black/85 shadow-[0_24px_70px_-30px_rgba(0,0,0,1)] backdrop-blur-2xl backdrop-saturate-150"
            : "border-white/[0.08] bg-black/70 shadow-[0_16px_50px_-28px_rgba(0,0,0,0.95)] backdrop-blur-xl backdrop-saturate-150"
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 sm:px-5">
          <a href="/" className="flex items-center gap-3">
            <Image
              src="/dark-icon.svg"
              alt=""
              width={40}
              height={40}
              className="w-10 h-10"
              priority
            />
            <span className="text-xl font-bold tracking-tight">JevRail</span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 rounded-lg hover:bg-secondary/50"
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* GitHub link */}
          <div className="hidden md:flex items-center gap-3">
            <Button asChild size="sm" className="bg-foreground hover:bg-foreground/90 text-background">
              <a href={githubUrl} target="_blank" rel="noreferrer">
                <Github className="w-4 h-4 mr-2" />
                Star on GitHub
              </a>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-secondary/50 transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={`md:hidden overflow-hidden px-4 sm:px-5 transition-all duration-300 ${
            isMobileMenuOpen ? "max-h-[500px] pb-6" : "max-h-0"
          }`}
        >
          <div className="flex flex-col gap-2 pt-4 border-t border-border/50">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
              >
                {link.name}
              </Link>
            ))}
            <div className="flex flex-col gap-2 pt-4 mt-2 border-t border-border/50">
              <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <a href={githubUrl} target="_blank" rel="noreferrer">
                  <Github className="w-4 h-4 mr-2" />
                  Star on GitHub
                </a>
              </Button>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
