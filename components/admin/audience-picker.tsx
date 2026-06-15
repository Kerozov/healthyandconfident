"use client";

import { useEffect, useState } from "react";
import type { AudienceInput, Segment } from "@/lib/supabase/types";
import { previewAudience } from "@/app/(admin)/admin/actions";
import { Field, Select } from "@/components/admin/fields";
import { cn } from "@/lib/utils";

const EMPTY_AUDIENCE: AudienceInput = {
  mode: "segment",
  segment_key: "all",
  tags: [],
  locale: "",
};

export function AudiencePicker({
  segments,
  subscriberTags,
  value,
  onChange,
  channel = "email",
}: {
  segments: Segment[];
  subscriberTags: string[];
  value: AudienceInput;
  onChange: (next: AudienceInput) => void;
  channel?: "email" | "sms";
}) {
  const [preview, setPreview] = useState<{
    emails: number;
    phones: number;
    label: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    previewAudience(value)
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setPreview({ emails: res.emails, phones: res.phones, label: res.label });
        } else {
          setPreview(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  const selectedTags = value.tags ?? [];
  const allTagOptions = [
    ...new Set([
      ...segments.map((s) => s.key).filter((k) => k !== "all"),
      ...subscriberTags,
    ]),
  ].sort();

  function toggleTag(tag: string) {
    const next = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    onChange({ ...value, tags: next });
  }

  const count = channel === "sms" ? preview?.phones : preview?.emails;

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-full border border-ink/10 p-1">
        <button
          type="button"
          onClick={() => onChange({ ...value, mode: "segment" })}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-semibold",
            value.mode === "segment" ? "bg-forest-600 text-cream" : "text-ink-soft",
          )}
        >
          By segment
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...value, mode: "tags", tags: selectedTags })}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-semibold",
            value.mode === "tags" ? "bg-forest-600 text-cream" : "text-ink-soft",
          )}
        >
          By tags
        </button>
      </div>

      {value.mode === "segment" ? (
        <Field label="Segment" hint="Named audience from your segments list.">
          <Select
            value={value.segment_key || "all"}
            onChange={(e) => onChange({ ...value, segment_key: e.target.value })}
          >
            {segments.map((s) => (
              <option key={s.key} value={s.key}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <Field
          label="Tags"
          hint="Subscribers with any of the selected tags (OR). Create segments on the Subscribers page."
        >
          {allTagOptions.length === 0 ? (
            <p className="text-sm text-ink-soft">No tags yet — add tags to subscribers first.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allTagOptions.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                      active
                        ? "border-coral-400 bg-coral-500/10 text-coral-600"
                        : "border-ink/15 text-ink-soft hover:border-ink/30",
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          )}
        </Field>
      )}

      <Field label="Language">
        <Select
          value={value.locale ?? ""}
          onChange={(e) =>
            onChange({ ...value, locale: e.target.value as "" | "bg" | "en" })
          }
        >
          <option value="">All languages</option>
          <option value="bg">BG only</option>
          <option value="en">EN only</option>
        </Select>
      </Field>

      <p className="rounded-xl bg-cream-2/60 px-4 py-3 text-sm text-ink-soft">
        {loading ? (
          "Counting audience…"
        ) : preview ? (
          <>
            <strong className="text-ink">{count ?? 0}</strong>{" "}
            {channel === "sms" ? "phone numbers" : "emails"} match{" "}
            <span className="text-ink/80">{preview.label}</span>
            {value.locale ? ` (${value.locale.toUpperCase()})` : ""}
          </>
        ) : (
          "Could not preview audience."
        )}
      </p>
    </div>
  );
}

export { EMPTY_AUDIENCE };
