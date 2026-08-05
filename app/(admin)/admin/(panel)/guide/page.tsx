import Link from "next/link";
import { ArrowRight, Lightbulb, Rocket } from "lucide-react";
import { ADMIN_GUIDE, GUIDE_FIRST_STEPS } from "@/lib/admin/guide-content";
import { PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Ръководство" };

export default function AdminGuidePage() {
  return (
    <div>
      <PageHeader
        title="Ръководство"
        description="Как работи всеки екран в админа — стъпка по стъпка, на едно място. Отвори го винаги когато не си сигурна какво прави даден бутон."
      />

      <section className="rounded-2xl border border-forest-500/25 bg-forest-50/50 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <Rocket className="h-5 w-5 text-forest-700" aria-hidden />
          Първите 5 стъпки
        </h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {GUIDE_FIRST_STEPS.map((step) => (
            <li
              key={step.title}
              className="rounded-xl border border-forest-500/20 bg-white p-4"
            >
              <p className="text-sm font-semibold text-ink">{step.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <nav aria-label="Съдържание" className="mt-8">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-soft/70">
          Съдържание
        </p>
        <ul className="flex flex-wrap gap-2">
          {ADMIN_GUIDE.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-white px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-ink/5 hover:text-ink"
              >
                <section.icon className="h-3.5 w-3.5" aria-hidden />
                {section.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-8 space-y-5">
        {ADMIN_GUIDE.map((section) => {
          const Icon = section.icon;
          return (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-6 rounded-2xl border border-ink/10 bg-white p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-700">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    {section.title}
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-soft">
                    {section.summary}
                  </p>
                </div>
                {section.href && (
                  <Link
                    href={section.href}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-ink/15 px-3.5 py-2 text-xs font-semibold text-ink-soft hover:bg-ink/5 hover:text-ink"
                  >
                    Отвори
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                )}
              </div>

              <ol className="mt-5 grid gap-3 lg:grid-cols-2">
                {section.steps.map((step, index) => (
                  <li
                    key={step.title}
                    className="flex gap-3 rounded-xl border border-ink/10 bg-cream-2/40 p-4"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-600 text-xs font-bold text-cream">
                      {index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink">
                        {step.title}
                      </span>
                      <span className="mt-1 block text-sm leading-relaxed text-ink-soft">
                        {step.text}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>

              {section.tips && section.tips.length > 0 && (
                <div className="mt-4 rounded-xl border border-gold-500/30 bg-gold-50/40 p-4">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gold-600">
                    <Lightbulb className="h-4 w-4" aria-hidden />
                    Полезно
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {section.tips.map((tip) => (
                      <li key={tip} className="text-sm leading-relaxed text-ink-soft">
                        · {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
