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
              ? "h-4 w-4 fill-peach-400 text-peach-400"
              : "h-4 w-4 fill-warm-100 text-warm-100"
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
    <section id="google-reviews" className="scroll-mt-24 bg-rose-50 py-24">
      <Container>
        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="lg:sticky lg:top-28">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#F0D5CC] bg-white px-4 py-2 text-sm font-medium text-warm-800">
              <GoogleIcon className="h-5 w-5" />
              Google Reviews
            </div>
            <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight text-warm-900 sm:text-4xl">
              {googleReviews.title}
            </h2>
            <p className="mt-4 max-w-md text-warm-800">{googleReviews.subtitle}</p>

            <div className="mt-8 flex items-center gap-5 rounded-2xl border border-[#F0D5CC] bg-white p-6">
              <div>
                <p className="font-display text-4xl font-semibold text-warm-900">
                  {googleReviews.aggregateRating}
                </p>
                <StarRow rating={5} />
                <p className="mt-2 text-sm text-warm-700">
                  {googleReviews.reviewCount} {googleReviews.reviewCountLabel}
                </p>
              </div>
              <div className="hidden h-16 w-px bg-[#F0D5CC] sm:block" />
              <div className="hidden sm:block">
                <GoogleIcon className="h-10 w-10" />
                <p className="mt-2 text-xs font-medium text-[#8B6A5A]">
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
                className="flex flex-col rounded-2xl border border-[#F0D5CC] bg-warm-50 p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <StarRow rating={review.rating} />
                  <GoogleIcon className="h-5 w-5 shrink-0 opacity-80" />
                </div>
                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-warm-800">
                  &ldquo;{review.quote}&rdquo;
                </blockquote>
                <footer className="mt-5 border-t border-[#F0D5CC] pt-4">
                  <p className="font-medium text-warm-900">{review.name}</p>
                  <p className="mt-1 text-sm text-warm-700">
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
