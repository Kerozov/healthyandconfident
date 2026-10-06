import ReactMarkdown, { type Components, type ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Locale } from "@/i18n/config";
import { buttonVariants } from "@/components/ui/button";
import { CardImage } from "@/components/site/card-image";
import { markdownLinkStyle, resolveMarkdownHref } from "@/lib/site/markdown-links";
import {
  parseImageTitle,
  safeImageSrc,
  type ImageLayout,
} from "@/lib/site/markdown-images";
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

type HastElement = NonNullable<ExtraProps["node"]>;
type HastChild = HastElement["children"][number];

type Picture = { src: string; alt: string; title: string; href: string };

function isBlank(child: HastChild): boolean {
  return child.type === "text" && !child.value.trim();
}

function pictureFrom(img: HastElement, href: string): Picture | null {
  const src = safeImageSrc(String(img.properties.src ?? ""));
  if (!src) return null;
  return {
    src,
    alt: String(img.properties.alt ?? ""),
    title: String(img.properties.title ?? ""),
    href,
  };
}

/**
 * The pictures a paragraph consists of — `![…](…)`, or one wrapped in a link
 * — or null when there is any text in it. Such a paragraph is drawn as a
 * figure (one picture) or a gallery row (several) instead of a `<p>`.
 */
function picturesOnly(node: HastElement | undefined): Picture[] | null {
  if (!node) return null;
  const pictures: Picture[] = [];
  for (const child of node.children) {
    if (isBlank(child)) continue;
    if (child.type !== "element") return null;

    let picture: Picture | null = null;
    if (child.tagName === "img") {
      picture = pictureFrom(child, "");
    } else if (child.tagName === "a") {
      const inner = child.children.filter((c) => !isBlank(c));
      const img = inner[0];
      if (inner.length === 1 && img.type === "element" && img.tagName === "img") {
        picture = pictureFrom(img, String(child.properties.href ?? ""));
      }
    }
    if (!picture) return null;
    pictures.push(picture);
  }
  return pictures.length > 0 ? pictures : null;
}

function PictureLink({
  href,
  locale,
  children,
}: {
  href: string;
  locale: Locale;
  children: React.ReactNode;
}) {
  const url = resolveMarkdownHref(href, locale);
  if (!url) return <>{children}</>;
  const external = /^https?:\/\//i.test(url);
  return (
    <a
      href={url}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="block transition-opacity hover:opacity-90"
    >
      {children}
    </a>
  );
}

/**
 * Left and right float from `sm` up so the next paragraphs wrap around them;
 * on a phone every picture is full width. The others clear any float above.
 */
const FIGURE_LAYOUT: Record<ImageLayout, string> = {
  full: "clear-both my-8",
  center: "clear-both mx-auto my-8 sm:w-2/3",
  left: "my-6 sm:float-left sm:mb-4 sm:mr-8 sm:mt-1.5 sm:w-[46%]",
  right: "my-6 sm:float-right sm:mb-4 sm:ml-8 sm:mt-1.5 sm:w-[46%]",
};

function PostFigure({ picture, locale }: { picture: Picture; locale: Locale }) {
  const { layout, caption } = parseImageTitle(picture.title);
  return (
    <figure className={cn("not-prose", FIGURE_LAYOUT[layout])}>
      <PictureLink href={picture.href} locale={locale}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={picture.src}
          alt={picture.alt}
          loading="lazy"
          className="h-auto w-full rounded-2xl"
        />
      </PictureLink>
      {caption && (
        <figcaption className="mt-2 text-center text-sm text-ink-soft">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

function PostGallery({
  pictures,
  locale,
}: {
  pictures: Picture[];
  locale: Locale;
}) {
  const twoUp = pictures.length === 2 || pictures.length === 4;
  return (
    <div
      className={cn(
        "not-prose clear-both my-8 grid grid-cols-2 gap-3 sm:gap-4",
        !twoUp && "sm:grid-cols-3",
      )}
    >
      {pictures.map((picture, i) => {
        const { caption } = parseImageTitle(picture.title);
        return (
          <figure key={`${picture.src}-${i}`}>
            <PictureLink href={picture.href} locale={locale}>
              <CardImage
                src={picture.src}
                alt={picture.alt}
                className="aspect-[4/3] rounded-xl"
                sizes="(max-width: 768px) 50vw, 384px"
              />
            </PictureLink>
            {caption && (
              <figcaption className="mt-1.5 text-center text-xs text-ink-soft">
                {caption}
              </figcaption>
            )}
          </figure>
        );
      })}
    </div>
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
    p: ({ node, children }) => {
      const pictures = picturesOnly(node);
      if (!pictures) return <p>{children}</p>;
      if (pictures.length === 1) {
        return <PostFigure picture={pictures[0]} locale={locale} />;
      }
      return <PostGallery pictures={pictures} locale={locale} />;
    },
  };

  return (
    // `flow-root` keeps a picture floated at the very end inside the article.
    <div className="prose prose-hc prose-lg flow-root max-w-none prose-headings:font-display prose-headings:font-semibold prose-a:font-medium prose-img:rounded-2xl">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
