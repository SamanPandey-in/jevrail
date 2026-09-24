"use client";

import { useEffect, useState, useRef } from "react";
import { AsciiDna } from "./ascii-dna";

const regions = [
  { name: "North America", nodes: 5, latency: "< 20ms" },
  { name: "Europe", nodes: 4, latency: "< 25ms" },
  { name: "Asia Pacific", nodes: 3, latency: "< 30ms" },
  { name: "South America", nodes: 2, latency: "< 40ms" },
  { name: "Middle East", nodes: 2, latency: "< 35ms" },
  { name: "Africa", nodes: 1, latency: "< 50ms" },
];

export function InfrastructureSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-32 bg-muted/30 overflow-hidden">
      {/* ASCII DNA Background */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
        <AsciiDna className="w-[600px] h-[500px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Content */}
          <div
            className={`transition-all duration-700 ${
              isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
            }`}
          >
            <p className="text-sm font-mono text-primary mb-4">// GLOBAL INFRASTRUCTURE</p>
            <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight mb-6 text-balance">
              Built for planetary scale.
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              Deploy your AI models across our global edge network. Automatic failover, 
              intelligent routing, and sub-100ms latency anywhere in the world.
            </p>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <pre className="font-mono text-2xl text-primary">⚡</pre>
                <div>
                  <h3 className="font-semibold mb-1">Lightning Fast CDN</h3>
                  <p className="text-sm text-muted-foreground">
                    Edge caching and smart routing for optimal performance
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <pre className="font-mono text-2xl text-primary">🔄</pre>
                <div>
                  <h3 className="font-semibold mb-1">Auto-Scaling</h3>
                  <p className="text-sm text-muted-foreground">
                    Handle traffic spikes with zero configuration
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <pre className="font-mono text-2xl text-primary">🛡️</pre>
                <div>
                  <h3 className="font-semibold mb-1">DDoS Protection</h3>
                  <p className="text-sm text-muted-foreground">
                    Built-in protection against malicious traffic
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Regions Grid */}
          <div
            className={`transition-all duration-700 delay-200 ${
              isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
            }`}
          >
            <div className="grid grid-cols-1 gap-3">
              {regions.map((region, index) => (
                <div
                  key={region.name}
                  className="group relative bg-card rounded-lg p-5 border border-border card-shadow hover:border-primary/50 transition-all duration-300"
                  style={{ transitionDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{region.name}</h4>
                    <span className="font-mono text-xs text-primary">{region.latency}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {Array.from({ length: region.nodes }).map((_, i) => (
                        <span
                          key={i}
                          className="w-2 h-2 rounded-full bg-primary/70 animate-pulse"
                          style={{ animationDelay: `${i * 200}ms` }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      {region.nodes} {region.nodes === 1 ? "node" : "nodes"}
                    </span>
                  </div>
                  
                  {/* Animated ASCII Network Visualization */}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-30 transition-opacity font-mono text-xs text-primary">
                    <pre>{`
  ┌───┐
  │ ◉ │
  └─┬─┘
    │
`}</pre>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="mt-8 p-6 rounded-lg bg-foreground/5 border border-border">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="font-mono text-2xl font-semibold text-primary">17</div>
                  <div className="text-xs text-muted-foreground">Data Centers</div>
                </div>
                <div>
                  <div className="font-mono text-2xl font-semibold text-primary">99.99%</div>
                  <div className="text-xs text-muted-foreground">Uptime SLA</div>
                </div>
                <div>
                  <div className="font-mono text-2xl font-semibold text-primary">1.2B</div>
                  <div className="text-xs text-muted-foreground">Requests/day</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
