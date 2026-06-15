import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { getPosts } from "@/lib/admin/data";
import { formatDate } from "@/lib/utils";
import { DeletePostButton } from "@/components/admin/delete-post-button";

export const dynamic = "force-dynamic";

export default async function AdminBlogList() {
  const posts = await getPosts();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Blog</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {posts.length} post{posts.length === 1 ? "" : "s"} · BG &amp; EN
          </p>
        </div>
        <Link
          href="/admin/blog/new"
          className="inline-flex h-11 items-center gap-2 rounded-full bg-coral-500 px-5 font-semibold text-white hover:bg-coral-600"
        >
          <Plus className="h-4 w-4" /> New post
        </Link>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-ink/10 bg-white">
        {posts.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-soft">
            No posts yet. Create your first article.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft/60">
                <th className="p-4">Title</th>
                <th className="p-4">Lang</th>
                <th className="p-4">Status</th>
                <th className="p-4">Updated</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className="border-b border-ink/5 last:border-0">
                  <td className="p-4">
                    <span className="font-medium">{p.title}</span>
                    <span className="block text-xs text-ink-soft/60">/{p.slug}</span>
                  </td>
                  <td className="p-4">
                    <span className="rounded-full bg-forest-50 px-2 py-0.5 text-xs font-semibold uppercase text-forest-600">
                      {p.locale}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className={
                        p.status === "published"
                          ? "rounded-full bg-forest-500/15 px-2.5 py-1 text-xs font-medium text-forest-600"
                          : "rounded-full bg-gold-400/20 px-2.5 py-1 text-xs font-medium text-gold-500"
                      }
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="p-4 text-ink-soft">{formatDate(p.updated_at, "en")}</td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/blog/${p.id}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-ink/5 hover:text-ink"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <DeletePostButton id={p.id} locale={p.locale} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
