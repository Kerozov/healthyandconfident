import { ArrowRight, ClipboardList } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { SiteImage } from "@/components/site/site-image";
import { mediaAlt } from "@/lib/site/media-gallery";
import type { QuestionnaireCtaView } from "@/lib/site/questionnaire-cta";

/**
 * The entry questionnaire, right under the programmes: for everyone who is not
 * sure which one is theirs. Built like the free-menu card — picture, one line
 * of why, one button.
 */
export function QuestionnaireCta({
  view,
  locale,
}: {
  view: QuestionnaireCtaView;
  locale: Locale;
}) {
  const localImage = view.imageUrl.startsWith("/");
  return (
    <section id="questionnaire" className="scroll-mt-24 bg-cream pb-16 sm:pb-20">
      <Container>
        <div className="grid overflow-hidden rounded-3xl border border-forest-100 bg-white shadow-soft md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[20rem]">
            {localImage ? (
              <SiteImage
                src={view.imageUrl}
                alt={mediaAlt(view.imageUrl, locale)}
                fill
                sizes="(max-width: 768px) 100vw, 480px"
                imageClassName="object-cover object-[center_30%]"
              />
            ) : (
              // An upload from Storage — next/image only serves /public here.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={view.imageUrl}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover object-[center_30%]"
              />
            )}
          </div>
          <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-12">
            <p className="eyebrow">
              <ClipboardList className="h-4 w-4" aria-hidden /> {view.eyebrow}
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-slate-800 sm:text-4xl text-balance">
              {view.title}
            </h2>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-soft">{view.text}</p>
            <Button
              href={view.href}
              variant="forest"
              size="lg"
              className="mt-8 h-14 w-full rounded-full px-10 sm:w-fit"
            >
              {view.button}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
