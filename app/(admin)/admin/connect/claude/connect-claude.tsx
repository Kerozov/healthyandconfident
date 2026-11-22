"use client";

import { useState } from "react";
import { Field, Input } from "@/components/admin/fields";
import { AdminButton, Alert } from "@/components/admin/ui";
import { formatAdminWhen } from "@/lib/admin/format-time";
import type { McpConnection } from "@/lib/mcp/oauth";
import { approveConnector, denyConnector, requestConnectorCode, revokeConnectorAction } from "./actions";
import type { AuthorizeParams } from "./types";

const GRANTS = [
  "имейл и СМС кампании, тестове и отчети",
  "автоматизации и поредици",
  "абонати, групи, статуси и импорт",
  "форми, въпросници и отговори",
  "статии, съдържание на сайта, програми и продукти",
  "Black Friday, плащания, Zoom, Meta, Launchify и екипа",
];

export function ConnectClaudeForm({
  params,
  clientName,
  redirectHost,
  sendTo,
}: {
  params: AuthorizeParams;
  clientName: string;
  redirectHost: string;
  sendTo: string;
}) {
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function sendCode() {
    setError(null);
    setPending(true);
    try {
      const res = await requestConnectorCode(params);
      if (!res.ok) return setError(res.message);
      setChallengeId(res.challengeId);
      setCode("");
    } catch {
      setError("Кодът не тръгна. Опитай пак.");
    } finally {
      setPending(false);
    }
  }

  async function approve(e: React.FormEvent) {
    e.preventDefault();
    if (!challengeId) return;
    setError(null);
    setPending(true);
    try {
      const res = await approveConnector(params, challengeId, code);
      if (!res.ok) return setError(res.message);
      setDone(true);
      window.location.assign(res.redirectTo);
    } catch {
      setError("Не стана. Опитай пак.");
    } finally {
      setPending(false);
    }
  }

  async function deny() {
    setPending(true);
    try {
      const res = await denyConnector(params);
      if (res.ok) window.location.assign(res.redirectTo);
      else setError(res.message);
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return <Alert variant="success">Свързано. Връщам те в Claude…</Alert>;
  }

  return (
    <div className="space-y-5">
      <div className="text-sm leading-relaxed text-ink">
        <p>
          <b>{clientName}</b> ({redirectHost}) иска пълен достъп до админа:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-soft">
          {GRANTS.map((grant) => (
            <li key={grant}>{grant}</li>
          ))}
        </ul>
        <p className="mt-3 text-ink-soft">
          Изпращане, изтриване и публикуване стават само когато ти го кажеш в чата.
        </p>
      </div>

      {error ? <Alert variant="warning">{error}</Alert> : null}

      {!challengeId ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <AdminButton onClick={sendCode} disabled={pending} className="sm:flex-1">
            {pending ? "Пращам…" : `Прати код на ${sendTo}`}
          </AdminButton>
          <AdminButton variant="secondary" onClick={deny} disabled={pending}>
            Откажи
          </AdminButton>
        </div>
      ) : (
        <form onSubmit={approve} className="space-y-4">
          <Field label={`Кодът от имейла до ${sendTo}`} htmlFor="mcp-code">
            <Input
              id="mcp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
              maxLength={7}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
            />
          </Field>
          <div className="flex flex-col gap-2 sm:flex-row">
            <AdminButton type="submit" disabled={pending || code.replace(/\D/g, "").length !== 6} className="sm:flex-1">
              {pending ? "Проверявам…" : "Разреши"}
            </AdminButton>
            <AdminButton variant="ghost" onClick={sendCode} disabled={pending}>
              Нов код
            </AdminButton>
          </div>
        </form>
      )}
    </div>
  );
}

export function ConnectionsList({ initial }: { initial: McpConnection[] }) {
  const [connections, setConnections] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function revoke(clientId: string) {
    setError(null);
    setBusy(clientId);
    try {
      const res = await revokeConnectorAction(clientId);
      if (!res.ok) return setError(res.message);
      setConnections((list) => list.filter((c) => c.clientId !== clientId));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-5 space-y-3">
      {error ? <Alert variant="warning">{error}</Alert> : null}
      {connections.length === 0 ? (
        <p className="text-sm text-ink-soft">Няма свързани Claude-и.</p>
      ) : (
        <ul className="divide-y divide-ink/10">
          {connections.map((c) => (
            <li key={c.clientId} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0 text-sm">
                <p className="truncate font-semibold text-ink">{c.name}</p>
                <p className="text-ink-soft">
                  Свързан {formatAdminWhen(c.createdAt)}
                  {c.lastUsedAt ? ` · ползван ${formatAdminWhen(c.lastUsedAt)}` : ""}
                </p>
              </div>
              <AdminButton variant="danger" size="sm" onClick={() => revoke(c.clientId)} disabled={busy === c.clientId}>
                Откачи
              </AdminButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
