import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { GithubIcon as Github } from "@/components/shared/github-icon";
import { XIcon } from "@/components/shared/x-icon";
import { SITE_NAME, SITE_CONTACT_EMAIL, GITHUB_URL, X_URL, X_HANDLE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch about ${SITE_NAME}.`,
  openGraph: {
    title: "Contact | JevRail",
    description: `Get in touch about ${SITE_NAME}.`,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Contact JevRail" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact | JevRail",
    images: ["/og.png"],
  },
};

const contactLinks = [
  {
    icon: Mail,
    label: "Email",
    value: SITE_CONTACT_EMAIL,
    href: `mailto:${SITE_CONTACT_EMAIL}`,
    description: "Bug reports, questions, or anything else.",
  },
  {
    icon: Github,
    label: "GitHub",
    value: "SamanPandey-in/jevrail",
    href: GITHUB_URL,
    description: "Open an issue — especially the exact command that was wrongly blocked or allowed.",
  },
  {
    icon: XIcon,
    label: "X",
    value: X_HANDLE,
    href: X_URL,
    description: "Follow for updates, or send a DM.",
  },
];

export default function ContactPage() {
  return (
    <LegalLayout title="Contact">
      <p>
        The most useful contribution to {SITE_NAME} is a bug report with the exact command that
        was wrongly blocked or wrongly allowed. For anything else, pick whichever of these works
        best for you.
      </p>

      <div className="not-prose grid gap-4 sm:grid-cols-3 mt-8">
        {contactLinks.map(({ icon: Icon, label, value, href, description }) => (
          <a
            key={label}
            href={href}
            target={href.startsWith("mailto:") ? undefined : "_blank"}
            rel={href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
            className="flex flex-col gap-3 p-5 rounded-xl border border-border bg-card/60 hover:border-primary/40 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-sm text-primary break-all">{value}</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
          </a>
        ))}
      </div>
    </LegalLayout>
  );
}
