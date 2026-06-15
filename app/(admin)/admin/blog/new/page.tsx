import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PostEditor } from "@/components/admin/post-editor";

export default function NewPostPage() {
  return (
    <div>
      <Link
        href="/admin/blog"
        className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to blog
      </Link>
      <h1 className="mt-3 font-display text-3xl font-semibold">New post</h1>
      <div className="mt-8">
        <PostEditor />
      </div>
    </div>
  );
}
