"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deletePost } from "@/app/(admin)/admin/actions";

export function DeletePostButton({
  id,
  locale,
}: {
  id: string;
  locale: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this post permanently?")) return;
        startTransition(async () => {
          await deletePost(id, locale);
          router.refresh();
        });
      }}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-coral-500/10 hover:text-coral-600 disabled:opacity-50"
      title="Delete"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
