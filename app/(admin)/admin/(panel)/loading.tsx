import { Loader2 } from "lucide-react";

export default function AdminPanelLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-ink-soft"
    >
      <Loader2 className="h-8 w-8 animate-spin text-forest-600" aria-hidden />
      <p className="text-sm font-medium">Зареждане…</p>
    </div>
  );
}
