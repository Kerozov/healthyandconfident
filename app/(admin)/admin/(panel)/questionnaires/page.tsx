import { getQuestionnaireForms, getQuestionnaireReport } from "@/lib/admin/questionnaire-report";
import { publicFormUrl } from "@/lib/forms/urls";
import type { ShareLink } from "@/lib/site/share-links";
import { locales } from "@/i18n/config";
import { QuestionnaireView } from "@/components/admin/questionnaire-view";
import { QuestionnaireSitePanel } from "@/components/admin/questionnaire-site-panel";
import { getAdminQuestionnaireCta } from "@/lib/site/questionnaire-cta-data";
import { getAdminSession, sessionCanAccess } from "@/lib/admin/auth";
import { AdminButton, PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const LOCALE_LABEL = { bg: "Български", en: "English" } as const;

export default async function AdminQuestionnairesPage({
  searchParams,
}: {
  searchParams: Promise<{ form?: string }>;
}) {
  const { form: wanted } = await searchParams;
  const [forms, cta, session] = await Promise.all([
    getQuestionnaireForms(),
    getAdminQuestionnaireCta(),
    getAdminSession(),
  ]);
  // The asked-for form, else the one people answered most recently.
  const selected =
    forms.find((f) => f.slug === wanted || f.id === wanted) ??
    forms.find((f) => f.responses > 0) ??
    forms[0] ??
    null;
  const report = selected ? await getQuestionnaireReport(selected.id) : null;

  const links: ShareLink[] = selected
    ? locales.map((locale) => ({
        label: LOCALE_LABEL[locale],
        locale,
        path: `/${locale}/forms/${selected.slug}`,
        url: publicFormUrl(selected.slug, locale),
        primary: false,
      }))
    : [];

  return (
    <div>
      <PageHeader
        title="Въпросници"
        description="Входният въпросник на сайта и отговорите от формите - колко души са попълнили, какво са отговорили и кои са. Кликни отговор, за да видиш само тези хора."
        actions={
          <AdminButton href="/admin/forms" variant="secondary" size="sm">
            Редактирай формите
          </AdminButton>
        }
      />
      <QuestionnaireView
        key={report?.form.id ?? "none"}
        forms={forms}
        report={report}
        links={links}
        sitePanel={
          <QuestionnaireSitePanel
            key={cta.row?.updated_at ?? "new"}
            row={cta.row}
            available={cta.available}
            canEdit={Boolean(session && sessionCanAccess(session, "website"))}
            forms={forms}
            currentFormSlug={selected?.slug ?? ""}
          />
        }
      />
    </div>
  );
}
