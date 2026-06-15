"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, Save } from "lucide-react";
import type { BlogPost } from "@/lib/supabase/types";
import { savePost } from "@/app/(admin)/admin/actions";
import { Field, Input, Textarea, Select, Card } from "@/components/admin/fields";
import { Markdown } from "@/components/site/markdown";
import { slugify } from "@/lib/utils";

export function PostEditor({ post }: { post?: BlogPost }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    locale: post?.locale ?? "bg",
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    excerpt: post?.excerpt ?? "",
    content: post?.content ?? "",
    cover_image: post?.cover_image ?? "",
    tags: post?.tags?.join(", ") ?? "",
    seo_title: post?.seo_title ?? "",
    seo_description: post?.seo_description ?? "",
    status: post?.status ?? "draft",
    featured: post?.featured ?? false,
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(status: "draft" | "published") {
    setError(null);
    startTransition(async () => {
      const res = await savePost({
        id: post?.id,
        locale: form.locale as "bg" | "en",
        title: form.title,
        slug: form.slug || slugify(form.title),
        excerpt: form.excerpt,
        content: form.content,
        cover_image: form.cover_image,
        tags: form.tags,
        seo_title: form.seo_title,
        seo_description: form.seo_description,
        status,
        featured: form.featured,
      });
      if (!res.ok) {
        setError(res.message || "Failed to save");
        return;
      }
      router.push("/admin/blog");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
      <div className="space-y-6">
        <Card>
          <Field label="Title">
            <Input
              value={form.title}
              onChange={(e) => {
                set("title", e.target.value);
                if (!post) set("slug", slugify(e.target.value));
              }}
              placeholder="Article title"
            />
          </Field>
          <div className="mt-4">
            <Field label="Slug" hint="URL: /blog/your-slug">
              <Input
                value={form.slug}
                onChange={(e) => set("slug", e.target.value)}
                placeholder="article-slug"
              />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Excerpt" hint="Short summary used in listings & SEO.">
              <Textarea
                rows={2}
                value={form.excerpt}
                onChange={(e) => set("excerpt", e.target.value)}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Content (Markdown)</h2>
            <button
              type="button"
              onClick={() => setPreview((p) => !p)}
              className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1.5 text-xs font-medium hover:bg-ink/5"
            >
              <Eye className="h-3.5 w-3.5" /> {preview ? "Edit" : "Preview"}
            </button>
          </div>
          {preview ? (
            <div className="min-h-[300px] rounded-xl border border-ink/10 bg-cream-2/40 p-5">
              <Markdown content={form.content || "_Nothing to preview_"} />
            </div>
          ) : (
            <Textarea
              rows={18}
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              placeholder="Write in Markdown — ## headings, **bold**, lists, [links](url), images..."
              className="font-mono text-[13px]"
            />
          )}
        </Card>
      </div>

      <div className="space-y-6">
        <Card title="Publish">
          <div className="space-y-4">
            <Field label="Language">
              <Select
                value={form.locale}
                onChange={(e) => set("locale", e.target.value as "bg" | "en")}
              >
                <option value="bg">Български (BG)</option>
                <option value="en">English (EN)</option>
              </Select>
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => set("featured", e.target.checked)}
              />
              Featured post
            </label>
            {error && <p className="text-sm text-coral-600">{error}</p>}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => submit("published")}
                disabled={pending}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-coral-500 font-semibold text-white hover:bg-coral-600 disabled:opacity-60"
              >
                <Save className="h-4 w-4" /> Publish
              </button>
              <button
                onClick={() => submit("draft")}
                disabled={pending}
                className="inline-flex h-11 items-center justify-center rounded-full border border-ink/15 font-semibold hover:bg-ink/5 disabled:opacity-60"
              >
                Save draft
              </button>
            </div>
          </div>
        </Card>

        <Card title="Media & taxonomy">
          <Field label="Cover image URL">
            <Input
              value={form.cover_image}
              onChange={(e) => set("cover_image", e.target.value)}
              placeholder="https://..."
            />
          </Field>
          <div className="mt-4">
            <Field label="Tags" hint="Comma separated">
              <Input
                value={form.tags}
                onChange={(e) => set("tags", e.target.value)}
                placeholder="insulin resistance, weight loss"
              />
            </Field>
          </div>
        </Card>

        <Card title="SEO">
          <Field label="SEO title" hint="Defaults to the post title.">
            <Input
              value={form.seo_title}
              onChange={(e) => set("seo_title", e.target.value)}
            />
          </Field>
          <div className="mt-4">
            <Field label="Meta description" hint="~150-160 characters.">
              <Textarea
                rows={3}
                value={form.seo_description}
                onChange={(e) => set("seo_description", e.target.value)}
              />
            </Field>
          </div>
        </Card>
      </div>
    </div>
  );
}
