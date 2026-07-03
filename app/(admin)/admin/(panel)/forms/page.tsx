import {
  getFormTemplates,
} from "@/lib/admin/forms-data";
import {
  getSegments,
  getSegmentGroups,
  getSubscriberTags,
} from "@/lib/admin/data";
import { FormsManager } from "@/components/admin/forms-manager";

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
      <h1 className="font-display text-3xl font-semibold">Форми</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Въпросници и форми с шаблони — изпращай по имейл и виж отговорите.
      </p>
      <div className="mt-8">
        <FormsManager
          forms={forms}
          segments={segments}
          groups={groups}
          subscriberTags={subscriberTags}
        />
      </div>
    </div>
  );
}
