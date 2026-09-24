"use client";

import { useEffect, useState, useRef } from "react";
import { AsciiCube } from "./ascii-cube";

const integrations = [
  { 
    name: "Slack", 
    category: "Communication",
    ascii: `  ┌─┐
  │#│
  └─┘`
  },
  { 
    name: "GitHub", 
    category: "Development",
    ascii: `  ╔═╗
  ║<║
  ╚═╝`
  },
  { 
    name: "Stripe", 
    category: "Payments",
    ascii: `  ┌$┐
  └─┘`
  },
  { 
    name: "PostgreSQL", 
    category: "Database",
    ascii: `  [█]
  [█]`
  },
  { 
    name: "Redis", 
    category: "Cache",
    ascii: `  ◈◈
  ◈◈`
  },
  { 
    name: "AWS", 
    category: "Cloud",
    ascii: `  ≋≋
  ≋≋`
  },
  { 
    name: "MongoDB", 
    category: "Database",
    ascii: `  {M}
  ---`
  },
  { 
    name: "Vercel", 
    category: "Hosting",
    ascii: `  ▲
  ─`
  },
];

export function IntegrationsSection() {
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
    <section ref={sectionRef} className="relative py-32 overflow-hidden">
      {/* ASCII Cube Background */}
      <div className="absolute left-10 top-1/3 opacity-5 pointer-events-none hidden xl:block">
        <AsciiCube className="w-[400px] h-[350px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div
          className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="text-sm font-mono text-primary mb-4">// INTEGRATION ECOSYSTEM</p>
          <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight mb-6 text-balance">
            Connect everything.<br />Build anything.
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Pre-built integrations with your favorite tools. No complex setup, 
            just plug and play with our extensive API library.
          </p>
        </div>

        {/* Integrations Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {integrations.map((integration, index) => (
            <div
              key={integration.name}
              className={`group relative bg-card rounded-xl p-6 border border-border card-shadow hover:border-primary/50 transition-all duration-500 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              {/* ASCII Icon */}
              <pre className="font-mono text-lg text-primary mb-4 leading-tight h-12 flex items-center justify-center">
                {integration.ascii}
              </pre>
              
              <div className="text-center">
                <h3 className="font-semibold mb-1">{integration.name}</h3>
                <p className="text-xs text-muted-foreground">{integration.category}</p>
              </div>

              {/* Hover indicator */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-primary font-mono text-xs">→</span>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Card */}
        <div
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-card to-muted/50 border border-border card-shadow transition-all duration-700 delay-300 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="relative z-10 p-8 lg:p-12">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-2xl lg:text-3xl font-semibold mb-4">
                  Need a custom integration?
                </h3>
                <p className="text-muted-foreground mb-6">
                  Our REST and GraphQL APIs make it easy to build custom integrations. 
                  Plus, get access to webhooks for real-time events.
                </p>
                <button className="px-6 py-3 bg-foreground text-background rounded-lg font-medium hover:bg-foreground/90 transition-colors">
                  View API Docs
                </button>
              </div>

              <div className="font-mono text-xs text-muted-foreground space-y-2 bg-background/50 rounded-lg p-6 border border-border">
                <div className="text-primary mb-2">// Example: Send notification</div>
                <div>
                  <span className="text-purple-400">const</span> response = <span className="text-blue-400">await</span> nexus.send({'{'}
                </div>
                <div className="pl-4">
                  <span className="text-green-400">channel</span>: <span className="text-yellow-400">&quot;#general&quot;</span>,
                </div>
                <div className="pl-4">
                  <span className="text-green-400">message</span>: <span className="text-yellow-400">&quot;AI inference complete&quot;</span>
                </div>
                <div>{'}'});</div>
              </div>
            </div>
          </div>

          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5 grid-pattern pointer-events-none" />
        </div>
      </div>
    </section>
  );
}
