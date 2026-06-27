import Link from "next/link";
import { ArrowUpRight, Clock } from "lucide-react";
import type { BlogPost } from "@/lib/supabase/types";
import type { Locale } from "@/i18n/config";
import { formatDate } from "@/lib/utils";

export function BlogCard({
  post,
  locale,
  minRead,
  readMore,
}: {
  post: BlogPost;
  locale: Locale;
  minRead: string;
  readMore: string;
}) {
  return (
    <Link
      href={`/${locale}/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-ink/10 bg-bg-card transition-all hover:-translate-y-1 hover:shadow-soft"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-forest-100">
        {post.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover_image}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-forest-400 to-forest-600 font-display text-2xl text-cream/90">
            Healthy &amp; Confident
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-soft/70">
          {post.tags.slice(0, 2).map((t) => (
            <span key={t} className="rounded-full bg-forest-50 px-2.5 py-1 text-forest-600">
              {t}
            </span>
          ))}
          {post.published_at && (
            <span>{formatDate(post.published_at, locale)}</span>
          )}
        </div>
        <h3 className="mt-3 font-display text-xl font-semibold leading-snug transition-colors group-hover:text-coral-600">
          {post.title}
        </h3>
        <p className="mt-2 line-clamp-3 flex-1 text-sm text-ink-soft">{post.excerpt}</p>
        <div className="mt-5 flex items-center justify-between text-sm font-semibold text-coral-600">
          <span className="inline-flex items-center gap-1.5">
            {readMore} <ArrowUpRight className="h-4 w-4" />
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-normal text-ink-soft/70">
            <Clock className="h-3.5 w-3.5" /> {post.reading_minutes} {minRead}
          </span>
        </div>
      </div>
    </Link>
  );
}
