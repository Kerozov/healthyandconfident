import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getPostBySlug, getAllPublishedSlugs, getPublishedPosts } from "@/lib/blog";
import { Container } from "@/components/ui/container";
import { Markdown } from "@/components/site/markdown";
import { BlogCard } from "@/components/site/blog-card";
import { JsonLd } from "@/components/seo/json-ld";
import { siteConfig } from "@/lib/site";
import { formatDate } from "@/lib/utils";

export async function generateStaticParams() {
  const slugs = await getAllPublishedSlugs();
  return slugs.map((s) => ({ locale: s.locale, slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const post = await getPostBySlug(locale, slug);
  if (!post) return { title: "Not found" };

  return {
    title: post.seo_title || post.title,
    description: post.seo_description || post.excerpt,
    alternates: { canonical: `/${locale}/blog/${slug}` },
    openGraph: {
      type: "article",
      title: post.seo_title || post.title,
      description: post.seo_description || post.excerpt,
      publishedTime: post.published_at || undefined,
      authors: [post.author],
      images: post.cover_image ? [post.cover_image] : [siteConfig.ogImage],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const l = locale as Locale;
  const dict = getDictionary(l);
  const post = await getPostBySlug(l, slug);
  if (!post) notFound();

  const related = (await getPublishedPosts(l))
    .filter((p) => p.id !== post.id)
    .slice(0, 3);

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: post.cover_image ? [post.cover_image] : [siteConfig.ogImage],
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: { "@type": "Person", name: post.author },
    publisher: {
      "@type": "Organization",
      name: siteConfig.brand,
      logo: {
        "@type": "ImageObject",
        url: `${siteConfig.domain}/icon.png`,
      },
    },
    mainEntityOfPage: `${siteConfig.domain}/${l}/blog/${slug}`,
    inLanguage: l === "bg" ? "bg" : "en-GB",
  };

  return (
    <article className="py-12">
      <JsonLd data={articleLd} />
      <Container className="max-w-3xl">
        <Link
          href={`/${l}/blog`}
          className="inline-flex items-center gap-2 text-sm font-medium text-ink-soft hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> {dict.blog.backToBlog}
        </Link>

        <div className="mt-8 flex flex-wrap items-center gap-3 text-xs text-ink-soft/70">
          {post.tags.map((t) => (
            <span key={t} className="rounded-full bg-forest-50 px-3 py-1 text-forest-600">
              {t}
            </span>
          ))}
          {post.published_at && <span>{formatDate(post.published_at, l)}</span>}
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> {post.reading_minutes} {dict.blog.minRead}
          </span>
        </div>

        <h1 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          {post.title}
        </h1>
        <p className="mt-4 text-lg text-ink-soft">{post.excerpt}</p>
      </Container>

      {post.cover_image && (
        <Container className="mt-10 max-w-4xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.cover_image}
            alt={post.title}
            className="aspect-[16/9] w-full rounded-3xl object-cover"
          />
        </Container>
      )}

      <Container className="mt-12 max-w-3xl">
        <Markdown content={post.content} />
      </Container>

      {related.length > 0 && (
        <Container className="mt-20">
          <h2 className="font-display text-2xl font-semibold">{dict.blog.related}</h2>
          <div className="mt-8 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <BlogCard
                key={p.id}
                post={p}
                locale={l}
                minRead={dict.blog.minRead}
                readMore={dict.blog.readMore}
              />
            ))}
          </div>
        </Container>
      )}
    </article>
  );
}
