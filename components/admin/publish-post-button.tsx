"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { publishPost } from "@/app/(admin)/admin/actions";

export function PublishPostButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      title="Publish"
      onClick={() => {
        startTransition(async () => {
          const res = await publishPost(id);
          if (!res.ok) {
            alert(res.message ?? "Could not publish.");
            return;
          }
          router.refresh();
        });
      }}
      className="inline-flex h-8 items-center gap-1 rounded-lg bg-forest-600 px-2.5 text-xs font-semibold text-cream hover:bg-forest-700 disabled:opacity-50"
    >
      <Send className="h-3.5 w-3.5" />
      Publish
    </button>
  );
}
