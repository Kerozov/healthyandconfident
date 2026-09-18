import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Locale } from "@/i18n/config";
import { buttonVariants } from "@/components/ui/button";
import { markdownLinkStyle, resolveMarkdownHref } from "@/lib/site/markdown-links";
import { cn } from "@/lib/utils";

/**
 * A link in a post. Most are plain; one whose title says so is drawn as a
 * button (see `lib/site/markdown-links.ts`), which is how a post gets a
 * „Запиши се“ button under a paragraph without any HTML in it.
 */
function MarkdownLink({
  href,
  title,
  locale,
  children,
}: {
  href?: string;
  title?: string;
  locale: Locale;
  children?: React.ReactNode;
}) {
  const url = resolveMarkdownHref(href, locale);
  const style = markdownLinkStyle(title);
  const external = /^https?:\/\//i.test(url);
  const rel = external ? "noopener noreferrer" : undefined;
  const target = external ? "_blank" : undefined;

  if (style === "link") {
    return (
      <a href={url || undefined} title={title} target={target} rel={rel}>
        {children}
      </a>
    );
  }

  return (
    <a
      href={url || undefined}
      target={target}
      rel={rel}
      // `not-prose` keeps the typography plugin's link colour and underline
      // off the button; the margins let two buttons sit side by side and wrap.
      className={cn(
        "not-prose my-1 mr-3 no-underline",
        buttonVariants({
          variant: style === "button" ? "forest" : "secondary",
          size: "md",
        }),
      )}
    >
      {children}
    </a>
  );
}

export function Markdown({
  content,
  locale = "bg",
}: {
  content: string;
  /** Language of the page the post is on — our own links get it in front. */
  locale?: Locale;
}) {
  const components: Components = {
    a: ({ href, title, children }) => (
      <MarkdownLink href={href} title={title} locale={locale}>
        {children}
      </MarkdownLink>
    ),
  };

  return (
    <div className="prose prose-hc prose-lg max-w-none prose-headings:font-display prose-headings:font-semibold prose-a:font-medium prose-img:rounded-2xl">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
