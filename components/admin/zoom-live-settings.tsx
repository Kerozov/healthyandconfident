"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { saveZoomLiveConfig } from "@/app/(admin)/admin/actions";
import type { ZoomLiveConfig } from "@/lib/supabase/types";
import { formatDate } from "@/lib/utils";

export function ZoomLiveSettings({ config }: { config: ZoomLiveConfig }) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    feature_enabled: config.feature_enabled,
    watch_meeting_id: config.watch_meeting_id ?? "",
    join_url: config.join_url,
    label_bg: config.label_bg,
    label_en: config.label_en,
    manual_is_live: config.manual_is_live,
  });
  const [message, setMessage] = useState<string | null>(null);

  function save() {
    startTransition(async () => {
      const res = await saveZoomLiveConfig({
        feature_enabled: form.feature_enabled,
        watch_meeting_id: form.watch_meeting_id.trim() || null,
        join_url: form.join_url.trim(),
        label_bg: form.label_bg.trim(),
        label_en: form.label_en.trim(),
        manual_is_live: form.manual_is_live,
      });
      setMessage(res.message ?? (res.ok ? "Запазено." : "Грешка."));
    });
  }

  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-5">
      <h2 className="font-display text-lg font-semibold">Бутон „На живо“ на сайта</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Когато пуснеш Zoom среща, на сайта се появява червен бутон за
        присъединяване. Сложи линка към срещата веднъж — после става
        автоматично.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block text-sm md:col-span-2">
          <span className="font-medium">Линк за влизане в Zoom</span>
          <input
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm"
            value={form.join_url}
            onChange={(e) => setForm({ ...form, join_url: e.target.value })}
            placeholder="https://zoom.us/j/..."
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Текст на бутона — български</span>
          <input
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm"
            value={form.label_bg}
            onChange={(e) => setForm({ ...form, label_bg: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Текст на бутона — английски</span>
          <input
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm"
            value={form.label_en}
            onChange={(e) => setForm({ ...form, label_en: e.target.value })}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.feature_enabled}
            onChange={(e) =>
              setForm({ ...form, feature_enabled: e.target.checked })
            }
          />
          Показвай бутона на сайта
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending || !form.join_url.trim()}
          className="inline-flex items-center gap-2 rounded-full bg-forest-600 px-5 py-2 text-sm font-semibold text-white hover:bg-forest-700 disabled:opacity-60"
        >
          <Save className="h-4 w-4" /> Запази
        </button>
        {message && <p className="text-sm text-ink-soft">{message}</p>}
      </div>

      <div className="mt-4 rounded-xl bg-ink/5 px-4 py-3 text-sm">
        <p>
          Сега:{" "}
          <strong className={config.is_live ? "text-red-600" : "text-ink"}>
            {config.is_live ? "на живо" : "няма активна среща"}
          </strong>
          {config.active_topic ? ` · ${config.active_topic}` : ""}
        </p>
        {config.live_started_at && (
          <p className="mt-1 text-xs text-ink-soft">
            Започна: {formatDate(config.live_started_at, "bg")}
          </p>
        )}
      </div>
    </section>
  );
}
