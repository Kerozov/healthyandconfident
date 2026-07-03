import { ExternalLink, Star } from "lucide-react";
import type { Dictionary } from "@/i18n/types";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/site/google-icon";
import { siteConfig } from "@/lib/site";

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={
            i < rating
              ? "h-4 w-4 fill-gold-400 text-gold-400"
              : "h-4 w-4 fill-forest-100 text-forest-100"
          }
        />
      ))}
    </div>
  );
}

export function GoogleReviews({ dict }: { dict: Dictionary }) {
  const { googleReviews } = dict;
  const reviewUrl = siteConfig.googleReviewsUrl;

  return (
    <section id="google-reviews" className="section-pad scroll-mt-24 bg-cream-2">
      <Container>
        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="lg:sticky lg:top-28">
            <div className="inline-flex items-center gap-2 rounded-full border border-forest-100 bg-white px-4 py-2 text-sm font-medium text-slate-800">
              <GoogleIcon className="h-5 w-5" />
              Google Reviews
            </div>
            <h2 className="mt-5 font-display text-3xl font-semibold text-slate-800 sm:text-4xl">
              {googleReviews.title}
            </h2>
            <p className="mt-4 max-w-md text-ink-soft">{googleReviews.subtitle}</p>

            <div className="mt-8 flex items-center gap-5 rounded-xl border border-forest-100 bg-white p-4 shadow-card">
              <div>
                <p className="text-4xl font-bold text-slate-800">
                  {googleReviews.aggregateRating}
                </p>
                <StarRow rating={5} />
                <p className="mt-2 text-sm text-ink-soft">
                  {googleReviews.reviewCount} {googleReviews.reviewCountLabel}
                </p>
              </div>
              <div className="hidden h-16 w-px bg-forest-100 sm:block" />
              <div className="hidden sm:block">
                <GoogleIcon className="h-10 w-10" />
                <p className="mt-2 text-xs font-medium text-ink-soft">
                  {googleReviews.verifiedLabel}
                </p>
              </div>
            </div>

            <Button
              href={reviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              size="lg"
              className="mt-8"
            >
              {googleReviews.ctaLabel}
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {googleReviews.items.map((review) => (
              <article
                key={`${review.name}-${review.date}`}
                className="flex flex-col rounded-xl border border-forest-100 bg-white p-5 shadow-card transition-shadow hover:shadow-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <StarRow rating={review.rating} />
                  <GoogleIcon className="h-5 w-5 shrink-0 opacity-80" />
                </div>
                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-ink-soft">
                  &ldquo;{review.quote}&rdquo;
                </blockquote>
                <footer className="mt-5 border-t border-forest-100 pt-4">
                  <p className="font-semibold text-slate-800">{review.name}</p>
                  <p className="mt-1 text-sm text-ink-soft">
                    {review.date} · {googleReviews.postedOnLabel}
                  </p>
                </footer>
              </article>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
