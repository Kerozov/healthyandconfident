"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import type { Segment } from "@/lib/supabase/types";
import { createSegment, deleteSegment } from "@/app/(admin)/admin/actions";
import { Field, Input, Card } from "@/components/admin/fields";

export function SegmentsManager({ segments }: { segments: Segment[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ key: "", name: "", description: "" });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createSegment({
        key: form.key || form.name,
        name: form.name,
        description: form.description || undefined,
      });
      if (!res.ok) {
        setError(res.message || "Failed");
        return;
      }
      setForm({ key: "", name: "", description: "" });
      router.refresh();
    });
  }

  function remove(id: string, name: string) {
    if (!confirm(`Delete segment "${name}"? Existing subscriber tags are not removed.`))
      return;
    startTransition(async () => {
      await deleteSegment(id);
      router.refresh();
    });
  }

  return (
    <Card title="Segments">
      <p className="mb-4 text-sm text-ink-soft">
        Segments appear in campaign targeting. Subscribers get a segment&apos;s{" "}
        <code className="text-xs">key</code> as a tag when they sign up via popup or
        when you assign it manually.
      </p>

      <form onSubmit={submit} className="mb-6 grid gap-4 md:grid-cols-4">
        <Field label="Name">
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="VIP clients"
            required
          />
        </Field>
        <Field label="Key (optional)" hint="Auto-generated from name if empty.">
          <Input
            value={form.key}
            onChange={(e) => setForm({ ...form, key: e.target.value })}
            placeholder="vip-clients"
          />
        </Field>
        <Field label="Description">
          <Input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional"
          />
        </Field>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={pending || !form.name}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-forest-600 px-5 text-sm font-semibold text-cream hover:bg-forest-700 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            Add segment
          </button>
        </div>
      </form>
      {error && <p className="mb-4 text-sm text-coral-600">{error}</p>}

      <div className="divide-y divide-ink/5 rounded-xl border border-ink/10">
        {segments.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <div>
              <p className="font-medium">{s.name}</p>
              <p className="text-xs text-ink-soft">
                <code>{s.key}</code>
                {s.description ? ` · ${s.description}` : ""}
              </p>
            </div>
            {s.key !== "all" && (
              <button
                onClick={() => remove(s.id, s.name)}
                disabled={pending}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-coral-500/10 hover:text-coral-600 disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
