import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { SITE_NAME, SITE_CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How the ${SITE_NAME} website and CLI handle your data.`,
  openGraph: {
    title: "Privacy Policy | JevRail",
    description: `How the ${SITE_NAME} website and CLI handle your data.`,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "JevRail Privacy Policy" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy | JevRail",
    images: ["/og.png"],
  },
};

const LAST_UPDATED = "September 24, 2026";

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated={LAST_UPDATED}>
      <p>
        {SITE_NAME} is an open-source CLI tool plus this marketing and documentation website. There
        is no account system and no hosted service that stores your data — this policy covers only
        what the website itself does, and points to where the CLI&apos;s own data handling is
        documented.
      </p>

      <h2>This website</h2>
      <p>
        This site ({SITE_NAME.toLowerCase()}.samanp.xyz) is a static marketing and documentation
        site. It uses Vercel Analytics to collect anonymous, aggregated page-view metrics (pages
        visited, referrers, rough device/browser type). This data isn&apos;t tied to your name or
        email, isn&apos;t sold, and isn&apos;t shared with advertisers. We don&apos;t set any
        tracking cookies, and there is no login, form submission, or account creation on this site
        beyond the optional email link on the Contact page.
      </p>

      <h2>The CLI tool</h2>
      <p>
        The jevrail CLI runs entirely on your own machine. Depending on your configuration, it may
        send a redacted version of the command you&apos;re about to run — plus compact repository
        context — to the Jev decision model over the network, so it can return a safety verdict.
        Exactly what is and isn&apos;t sent, how secrets are redacted, and how to run fully
        offline (<code>no_model=true</code>) is documented in detail in{" "}
        <Link href="/docs/privacy">the CLI&apos;s Privacy doc</Link>. We don&apos;t receive or store
        any of that data ourselves — it goes directly from your machine to the model provider you
        configure.
      </p>

      <h2>What we don&apos;t collect</h2>
      <p>
        We don&apos;t sell data, run ad trackers, or use anything from this site or the CLI to
        train models.
      </p>

      <h2>Third parties</h2>
      <p>
        This website is hosted on Vercel, which also provides the anonymous analytics above. The
        CLI talks directly to whatever <code>base_url</code> you configure (TypeSafe AI&apos;s Jev
        API by default, or a self-hosted compatible endpoint) — see the docs for details.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        If this policy changes materially, we&apos;ll update the date at the top of this page.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy — reach us at{" "}
        <a href={`mailto:${SITE_CONTACT_EMAIL}`}>{SITE_CONTACT_EMAIL}</a>, or see the{" "}
        <Link href="/contact">Contact page</Link>.
      </p>
    </LegalLayout>
  );
}
