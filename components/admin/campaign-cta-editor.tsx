"use client";

import { useState, useTransition } from "react";
import { Loader2, MousePointerClick } from "lucide-react";
import { updateEmailCampaignCta } from "@/app/(admin)/admin/actions";
import { Field, Input } from "@/components/admin/fields";
import { cn } from "@/lib/utils";

export function CampaignCtaEditor({
  campaignId,
  initialLabel,
  initialUrl,
}: {
  campaignId: string;
  initialLabel: string;
  initialUrl: string;
}) {
  const [pending, startTransition] = useTransition();
  const [label, setLabel] = useState(initialLabel);
  const [url, setUrl] = useState(initialUrl);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  const dirty = label !== initialLabel || url !== initialUrl;

  function save() {
    setMessage(null);
    startTransition(async () => {
      const res = await updateEmailCampaignCta(campaignId, {
        cta_label: label,
        cta_url: url,
      });
      setMessage({
        ok: res.ok,
        text: res.message ?? (res.ok ? "Saved." : "Save failed."),
      });
    });
  }

  return (
    <div className="mt-4 rounded-xl border border-gold-400/30 bg-gold-400/5 p-4">
      <div className="flex items-start gap-2">
        <MousePointerClick className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-sm font-medium text-ink">Бутон в имейла</p>
            <p className="mt-0.5 text-xs text-ink-soft/80">
              Промени линка по всяко време — вече изпратените имейли ще
              пренасочват към новия адрес без повторно изпращане.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Текст на бутона">
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Виж събитията"
              />
            </Field>
            <Field label="Линк (дестинация)">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="/bg#events или https://…"
              />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={pending || !dirty}
              className="inline-flex h-9 items-center gap-2 rounded-full bg-coral-500 px-4 text-sm font-semibold text-white hover:bg-coral-600 disabled:opacity-50"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Запази бутона
            </button>
            {message && (
              <p
                className={cn(
                  "text-xs",
                  message.ok ? "text-forest-600" : "text-coral-600",
                )}
              >
                {message.text}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
