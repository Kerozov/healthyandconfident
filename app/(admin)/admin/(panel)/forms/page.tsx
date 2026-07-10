import {
  getFormTemplates,
} from "@/lib/admin/forms-data";
import {
  getSegments,
  getSegmentGroups,
  getSubscriberTags,
} from "@/lib/admin/data";
import { FormsManager } from "@/components/admin/forms-manager";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminFormsPage() {
  const [forms, segments, groups, subscriberTags] = await Promise.all([
    getFormTemplates(),
    getSegments(),
    getSegmentGroups(),
    getSubscriberTags(),
  ]);

  return (
    <div>
      <PageHeader
        title="Форми"
        description="Въпросници и форми с шаблони — изпращай по имейл и виж отговорите."
      />
      <FormsManager
          forms={forms}
          segments={segments}
          groups={groups}
          subscriberTags={subscriberTags}
        />
    </div>
  );
}
