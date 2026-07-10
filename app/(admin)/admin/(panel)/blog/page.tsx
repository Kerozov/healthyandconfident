import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { getPosts } from "@/lib/admin/data";
import { formatDate } from "@/lib/utils";
import { DeletePostButton } from "@/components/admin/delete-post-button";
import { PublishPostButton } from "@/components/admin/publish-post-button";
import { AdminButton, PageHeader, Badge, DataTable } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminBlogList() {
  const posts = await getPosts();

  return (
    <div>
      <PageHeader
        title="Блог"
        description={`${posts.length} статии · BG & EN`}
        actions={
          <AdminButton href="/admin/blog/new">
            <Plus className="h-4 w-4" aria-hidden /> Нова статия
          </AdminButton>
        }
      />

      <DataTable
        empty={posts.length === 0 ? <p>Все още няма статии. Създай първата.</p> : undefined}
      >
        {posts.length > 0 && (
          <table className="w-full min-w-[40rem] text-sm">
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
                    <Badge tone="forest">{p.locale}</Badge>
                  </td>
                  <td className="p-4">
                    <Badge tone={p.status === "published" ? "success" : "warning"}>
                      {p.status === "published" ? "публикувана" : "чернова"}
                    </Badge>
                  </td>
                  <td className="p-4 text-ink-soft">{formatDate(p.updated_at, "bg")}</td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1">
                      {p.status !== "published" && <PublishPostButton id={p.id} />}
                      <Link
                        href={`/admin/blog/${p.id}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500/35"
                        aria-label={`Редактирай ${p.title}`}
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
      </DataTable>
    </div>
  );
}
