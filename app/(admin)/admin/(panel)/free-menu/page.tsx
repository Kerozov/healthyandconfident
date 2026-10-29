import { getFreeMenuReport } from "@/lib/admin/free-menu";
import { publicSiteOrigin } from "@/lib/site";
import { freeMenuPath } from "@/lib/site/free-menu";
import type { ShareLink } from "@/lib/site/share-links";
import { locales } from "@/i18n/config";
import { FreeMenuSignups } from "@/components/admin/free-menu-signups";
import { AdminButton, PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const LOCALE_LABEL = { bg: "Български", en: "English" } as const;

export default async function AdminFreeMenuPage() {
  const report = await getFreeMenuReport();
  const origin = publicSiteOrigin();
  const links: ShareLink[] = locales.map((locale) => ({
    label: LOCALE_LABEL[locale],
    locale,
    path: freeMenuPath(locale),
    url: `${origin}${freeMenuPath(locale)}`,
    // The site's own buttons open the popup, not this page - nothing to flag as "used".
    primary: false,
  }));

  return (
    <div>
      <PageHeader
        title="Безплатно меню"
        description="Всички, които са поискали безплатното 2-дневно меню - какво са отговорили във формата и дали имейлът с менюто е стигнал до тях."
        actions={
          <AdminButton href="/admin/popup" variant="secondary" size="sm">
            Текстове и бутон след записване
          </AdminButton>
        }
      />
      <FreeMenuSignups report={report} links={links} />
    </div>
  );
}
