import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { SITE_NAME, SITE_CONTACT_EMAIL, GITHUB_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms",
  description: `The terms that govern use of the ${SITE_NAME} website and CLI.`,
  openGraph: {
    title: "Terms | JevRail",
    description: `The terms that govern use of the ${SITE_NAME} website and CLI.`,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "JevRail Terms" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms | JevRail",
    images: ["/og.png"],
  },
};

const LAST_UPDATED = "September 24, 2026";

export default function TermsPage() {
  return (
    <LegalLayout title="Terms" lastUpdated={LAST_UPDATED}>
      <p>
        These terms cover this website ({SITE_NAME.toLowerCase()}.samanp.xyz) and the {SITE_NAME}{" "}
        CLI available at <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">{GITHUB_URL}</a>.
        There is no hosted service or account to sign up for — {SITE_NAME} runs locally on your
        machine.
      </p>

      <h2>The software</h2>
      <p>
        {SITE_NAME} is open-source software distributed under the MIT license (see the{" "}
        <a href={`${GITHUB_URL}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer">LICENSE</a>{" "}
        file in the repository). It is provided &quot;as is&quot;, without warranty of any kind. As
        the README and{" "}
        <Link href="/docs">docs</Link> explain, {SITE_NAME} is a seatbelt, not a sandbox — a
        best-effort guard against accidental damage from a coding agent, not a guarantee against
        every possible outcome.
      </p>

      <h2>Your responsibility</h2>
      <p>
        You are solely responsible for the commands run on your own machine, for how you configure
        thresholds and policy bands, and for verifying {SITE_NAME}&apos;s behavior fits your own
        risk tolerance before relying on it in a production or otherwise sensitive environment.
      </p>

      <h2>Third-party model provider</h2>
      <p>
        By default, {SITE_NAME} sends redacted command context to TypeSafe AI&apos;s Jev API to get
        a decision. Use of that API is subject to TypeSafe AI&apos;s own terms. You can avoid this
        entirely by running with <code>no_model=true</code> or pointing <code>base_url</code> at a
        self-hosted compatible endpoint — see{" "}
        <Link href="/docs/privacy">the Privacy doc</Link>.
      </p>

      <h2>This website</h2>
      <p>
        This site is provided for information and documentation purposes. We aim to keep it
        accurate but don&apos;t guarantee it is error-free or always available.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, {SITE_NAME}&apos;s author is not liable for any
        damages, direct or indirect, arising from the use of this website or the {SITE_NAME} CLI,
        including any command that runs despite an &quot;allow&quot; verdict, or any command
        blocked or delayed by an &quot;ask&quot;/&quot;deny&quot; verdict.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        If these terms change materially, we&apos;ll update the date at the top of this page.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms — reach us at{" "}
        <a href={`mailto:${SITE_CONTACT_EMAIL}`}>{SITE_CONTACT_EMAIL}</a>, or see the{" "}
        <Link href="/contact">Contact page</Link>.
      </p>
    </LegalLayout>
  );
}
