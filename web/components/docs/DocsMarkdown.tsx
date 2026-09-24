import Markdown, { type Components } from "react-markdown";
import type { Element as HastElement, ElementContent } from "hast";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import Link from "next/link";
import type { DocEntry } from "@/lib/docs/docs-manifest";
import { resolveDocHref } from "@/lib/docs/docs-content";
import { CodeBlock } from "./CodeBlock";

  // Flattens a hast node's text content. Used to pull the raw source out of
// a fenced code block so the copy button can put the *unstyled* text on
// the clipboard, not the syntax-highlighted markup.
function hastToText(node: ElementContent): string {
  if (node.type === "text") return node.value;
  if (node.type === "element") return node.children.map(hastToText).join("");
  return "";
}

export function DocsMarkdown({ entry, source }: { entry: DocEntry; source: string }) {
  const components: Components = {
    h1: (props) => <h1 id={props.id} className="text-3xl md:text-4xl font-extrabold text-foreground mt-0 mb-6 scroll-mt-24">{props.children}</h1>,
    h2: (props) => <h2 id={props.id} className="text-2xl font-bold text-foreground mt-12 mb-4 pb-2 border-b border-border scroll-mt-24">{props.children}</h2>,
    h3: (props) => <h3 id={props.id} className="text-lg font-bold text-foreground mt-8 mb-3 scroll-mt-24">{props.children}</h3>,
    h4: (props) => <h4 id={props.id} className="text-base font-semibold text-foreground/90 mt-6 mb-2 scroll-mt-24">{props.children}</h4>,
    p: (props) => <p className="text-muted-foreground leading-relaxed mb-5 text-[15px]">{props.children}</p>,
    a: (props) => {
      const rawHref = props.href ?? "";
      const href = resolveDocHref(entry, rawHref);
      const isExternal = /^https?:\/\//.test(href);
      if (isExternal) {
        return (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 underline underline-offset-2 decoration-primary/30">
            {props.children}
          </a>
        );
      }
      return (
        <Link href={href} className="text-primary hover:text-primary/80 underline underline-offset-2 decoration-primary/30">
          {props.children}
        </Link>
      );
    },
    img: (props) => (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={props.src} alt={props.alt ?? ""} className="rounded-xl border border-border my-8 w-full" />
    ),
    ul: (props) => <ul className="list-disc list-outside pl-6 mb-5 text-muted-foreground space-y-2 text-[15px]">{props.children}</ul>,
    ol: (props) => <ol className="list-decimal list-outside pl-6 mb-5 text-muted-foreground space-y-2 text-[15px]">{props.children}</ol>,
    li: (props) => <li className="leading-relaxed">{props.children}</li>,
    strong: (props) => <strong className="text-foreground font-semibold">{props.children}</strong>,
    // Inline `code` only. Fenced code blocks are handled entirely by the
    // `pre` renderer below (reading straight from the hast node) so that
    // block-level code can be swapped for a real CodeBlock with a copy
    // button, without this renderer's styled wrapper interfering.
    code: (props) => (
      <code className="bg-secondary/60 border border-border text-primary rounded px-1.5 py-0.5 text-[13px] font-mono">
        {props.children}
      </code>
    ),
    pre: (props) => {
      const preNode = props.node;
      const codeNode = preNode?.children.find(
        (child): child is HastElement => child.type === "element" && child.tagName === "code"
      );

      if (!codeNode) {
        return <pre className="bg-card border border-border rounded-xl p-4 overflow-x-auto text-[13px] font-mono mb-6">{props.children}</pre>;
      }

      const raw = codeNode.children.map(hastToText).join("").replace(/\n$/, "");
      const classNames = (codeNode.properties?.className as string[] | undefined) ?? [];
      const language = classNames.find((c) => c.startsWith("language-"))?.replace("language-", "");

      return <CodeBlock code={raw} label={language} className="mb-6" />;
    },
    blockquote: (props) => (
      <blockquote className="border-l-2 border-primary/40 pl-4 italic text-muted-foreground my-6">{props.children}</blockquote>
    ),
    hr: () => <hr className="border-border my-10" />,
    table: (props) => (
      <div className="overflow-x-auto rounded-xl border border-border my-6">
        <table className="w-full text-left border-collapse text-sm">{props.children}</table>
      </div>
    ),
    thead: (props) => <thead className="bg-secondary/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">{props.children}</thead>,
    tbody: (props) => <tbody className="divide-y divide-border text-foreground/90 bg-card/50">{props.children}</tbody>,
    th: (props) => <th className="py-3 px-4">{props.children}</th>,
    td: (props) => <td className="py-3 px-4 align-top">{props.children}</td>,
  };

  return (
    <div className="docs-prose max-w-none">
      <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]} components={components}>
        {source}
      </Markdown>
    </div>
  );
}

