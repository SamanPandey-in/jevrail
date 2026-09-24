"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";
import { GithubIcon as Github } from "@/components/shared/github-icon";
import { AsciiWave } from "./ascii-wave";
import { ShareOnXButton } from "@/components/shared/share-on-x-button";
import { InstallTabs } from "@/components/docs/InstallTabs";

export function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-20">
      {/* Subtle grid */}
      <div className="absolute inset-0 grid-pattern opacity-50" />
      
      {/* ASCII Wave full width and height */}
      <div className="absolute inset-0 opacity-30 pointer-events-none overflow-hidden">
        <AsciiWave className="w-full h-full" />
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-12 lg:py-24">
        {/* Badge */}
        <div 
          className={`flex justify-center mb-10 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          
        </div>
        
        {/* Headline */}
        <div className="text-center max-w-5xl mx-auto mb-5">
          <h1 
            className={`text-5xl md:text-7xl font-semibold tracking-tight leading-[0.95] mb-8 transition-all duration-700 delay-100 lg:text-7xl ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ fontFamily: 'var(--font-geist-pixel-line), monospace' }}
          >
            <span className="text-balance">Give your AI agents autonomy.</span>
            <br />
            <span className="text-primary text-balance">Not unlimited access.</span>
          </h1>
          
          <p 
            className={`text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed transition-all duration-700 delay-200 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }}`}
          >
            Jevrail evaluates every command before it runs, blocking dangerous actions and asking when things get risky.
          </p>
          {/* <div className="mt-5 inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 font-mono text-xs text-primary/90 transition-all duration-700 delay-250">
            Powered by Jev (typesafe.ai) for every decision
          </div> */}

        </div>
        
        {/* Install command */}
        <div className={`max-w-2xl mx-auto mb-20 transition-all duration-700 delay-300 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <InstallTabs compact />
          {/* <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="text-primary/90">Ultra low latency and high accuracy</span>
            </div> */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-md text-muted-foreground">
            <Link
              href="/docs/installation"
              className="inline-flex items-center gap-1.5 text-md font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Full installation guide
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <ShareOnXButton text="Give your AI agents autonomy, not unlimited access: check out JevRail." variant="link" />
          </div>
        </div>
        
        {/* Stats with company logos style */}
        <div 
          className={`grid grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden card-shadow transition-all duration-700 delay-400 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          {[
            { value: "3", label: "verdicts: allow, ask, deny.", company: "DECISION" },
            { value: "0", label: "commands run past a deny.", company: "SAFETY" },
            { value: "1", label: "policy layer for every agent.", company: "CONTROL" },
            { value: "∞", label: "ways to keep shipping safely.", company: "AUTONOMY" },
          ].map((stat) => (
            <div key={stat.company} className="p-6 lg:p-8 flex justify-between min-h-[140px] bg-black shadow-none lg:py-8 flex-col">
              <div>
                <span className="text-xl lg:text-2xl font-semibold">{stat.value}</span>
                <span className="text-muted-foreground text-sm lg:text-base"> {stat.label}</span>
              </div>
              <div className="font-mono text-xs text-muted-foreground/60 tracking-widest mt-4">
                {stat.company}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
