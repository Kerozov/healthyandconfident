import { Play } from "lucide-react";
import type { SiteSection, SiteVideo } from "@/lib/supabase/types";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";
import { youtubeEmbedUrl } from "@/lib/youtube";
import { cn } from "@/lib/utils";

export function VideosSection({
  dict,
  locale,
  section,
  videos,
}: {
  dict: Dictionary;
  locale: Locale;
  section: SiteSection;
  videos: SiteVideo[];
}) {
  const items = videos
    .map((video) => ({
      video,
      embed: youtubeEmbedUrl(video.youtube_url),
    }))
    .filter((row): row is { video: SiteVideo; embed: string } => Boolean(row.embed));

  if (items.length === 0) return null;

  const title =
    locale === "bg"
      ? section.title_bg || dict.videos.title
      : section.title_en || dict.videos.title;

  return (
    <section id="videos" className="section-pad scroll-mt-24 bg-white">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <span className="eyebrow text-forest-600">
            <Play className="h-4 w-4" /> {dict.videos.eyebrow}
          </span>
          <h2 className="mt-3 font-display text-3xl font-semibold text-slate-800 sm:text-4xl">
            {title}
          </h2>
          <p className="mt-4 text-forest-700/80">{dict.videos.subtitle}</p>
        </div>

        <div
          className={cn(
            "mt-14 grid gap-8",
            items.length === 1 && "mx-auto max-w-3xl",
            items.length === 2 && "mx-auto max-w-5xl md:grid-cols-2",
            items.length > 2 && "md:grid-cols-2 xl:grid-cols-3",
          )}
        >
          {items.map(({ video, embed }) => {
            const videoTitle =
              locale === "bg"
                ? video.title_bg || video.title_en
                : video.title_en || video.title_bg;

            return (
              <article
                key={video.id}
                className="overflow-hidden rounded-2xl border border-forest-200/80 bg-forest-50/30 shadow-sm"
              >
                <div className="relative aspect-video w-full bg-forest-900">
                  <iframe
                    src={embed}
                    title={videoTitle || "YouTube video"}
                    className="absolute inset-0 h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
                {videoTitle && (
                  <p className="px-4 py-3 text-sm font-medium leading-snug text-forest-800">
                    {videoTitle}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
