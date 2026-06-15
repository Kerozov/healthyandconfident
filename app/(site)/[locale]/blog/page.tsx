import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getPublishedPosts } from "@/lib/blog";
import { Container } from "@/components/ui/container";
import { BlogCard } from "@/components/site/blog-card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: dict.blog.title,
    description: dict.blog.subtitle,
    alternates: {
      canonical: `/${locale}/blog`,
      languages: { bg: "/bg/blog", en: "/en/blog" },
    },
  };
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const l = locale as Locale;
  const dict = getDictionary(l);
  const posts = await getPublishedPosts(l);

  return (
    <div className="py-16">
      <Container>
        <header className="mx-auto max-w-2xl text-center">
          <span className="eyebrow text-coral-500">Blog</span>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            {dict.blog.title}
          </h1>
          <p className="mt-4 text-ink-soft">{dict.blog.subtitle}</p>
        </header>

        {posts.length === 0 ? (
          <p className="mt-16 text-center text-ink-soft">{dict.blog.empty}</p>
        ) : (
          <div className="mt-14 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <BlogCard
                key={post.id}
                post={post}
                locale={l}
                minRead={dict.blog.minRead}
                readMore={dict.blog.readMore}
              />
            ))}
          </div>
        )}
      </Container>
    </div>
  );
}
