"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Leaf } from "lucide-react";
import { Field, Input } from "@/components/admin/fields";
import { AdminButton } from "@/components/admin/ui";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error || "Грешна парола");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Входът не успя. Опитай отново.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-2/40 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-forest-600 text-cream">
            <Leaf className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="mt-4 font-display text-2xl font-semibold text-ink">
            Healthy &amp; Confident
          </h1>
          <p className="mt-1 text-sm text-ink-soft">Вход в админ панела</p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft"
        >
          <Field label="Парола" htmlFor="admin-password">
            <Input
              id="admin-password"
              type="password"
              required
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Админ парола"
            />
          </Field>
          {error ? (
            <p className="mt-3 text-sm text-coral-600" role="alert">
              {error}
            </p>
          ) : null}
          <AdminButton type="submit" disabled={pending} className="mt-5 w-full">
            {pending ? "Влизане…" : "Вход"}
          </AdminButton>
        </form>
      </div>
    </div>
  );
}
