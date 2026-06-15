"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Leaf } from "lucide-react";

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
        setError((data as { error?: string }).error || "Login failed");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Login failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-forest-600 text-cream">
            <Leaf className="h-6 w-6" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-semibold">
            Healthy &amp; Confident
          </h1>
          <p className="mt-1 text-sm text-ink-soft">Admin sign in</p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft"
        >
          <label className="block text-sm font-medium">Password</label>
          <input
            type="password"
            required
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-ink/15 px-4 text-sm outline-none focus:border-coral-400 focus:ring-2 focus:ring-coral-400/20"
            placeholder="Admin password"
          />
          {error && (
            <p className="mt-3 text-sm text-coral-600">{error}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="mt-5 h-11 w-full rounded-full bg-coral-500 font-semibold text-white hover:bg-coral-600 disabled:opacity-60"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
