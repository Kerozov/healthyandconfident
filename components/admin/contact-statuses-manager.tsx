"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  createContactStatus,
  deleteContactStatus,
  reorderContactStatuses,
  updateContactStatus,
} from "@/app/(admin)/admin/contact-actions";
import { Card, Input } from "@/components/admin/fields";
import { AdminButton, Alert } from "@/components/admin/ui";
import { StatusBadge } from "@/components/admin/contact-status-badge";
import {
  normalizeStatusColor,
  STATUS_COLOR_KEYS,
  STATUS_COLORS,
  type StatusColor,
} from "@/lib/admin/contact-crm";
import type { ContactStatus } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

function ColorPicker({
  value,
  onChange,
  disabled,
}: {
  value: StatusColor;
  onChange: (color: StatusColor) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Цвят" className="flex flex-wrap gap-1.5">
      {STATUS_COLOR_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={value === key}
          aria-label={STATUS_COLORS[key].label}
          title={STATUS_COLORS[key].label}
          disabled={disabled}
          onClick={() => onChange(key)}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full ring-offset-2 transition",
            value === key ? "ring-2 ring-ink/40" : "hover:ring-2 hover:ring-ink/15",
          )}
        >
          <span className={cn("h-5 w-5 rounded-full", STATUS_COLORS[key].dot)} />
        </button>
      ))}
    </div>
  );
}

function StatusRow({
  status,
  count,
  first,
  last,
  disabled,
  onMove,
  onError,
}: {
  status: ContactStatus;
  count: number;
  first: boolean;
  last: boolean;
  disabled: boolean;
  onMove: (dir: -1 | 1) => void;
  onError: (message: string | null) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(status.name);
  const [color, setColor] = useState<StatusColor>(normalizeStatusColor(status.color));

  function save() {
    startTransition(async () => {
      const res = await updateContactStatus({ id: status.id, name, color });
      if (!res.ok) {
        onError(res.message ?? "Записът не успя.");
        return;
      }
      onError(null);
      setEditing(false);
      router.refresh();
    });
  }

  function remove() {
    const who =
      count > 0
        ? `\n\n${count === 1 ? "1 човек ще остане" : `${count} души ще останат`} без статус. Историята им се пази.`
        : "";
    if (!confirm(`Изтриване на статус „${status.name}“?${who}`)) return;
    startTransition(async () => {
      const res = await deleteContactStatus(status.id);
      if (!res.ok) onError(res.message ?? "Изтриването не успя.");
      else router.refresh();
    });
  }

  const busy = disabled || pending;

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="flex flex-col">
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={busy || first}
          aria-label="Нагоре"
          className="inline-flex h-6 w-6 items-center justify-center rounded text-ink-soft hover:bg-ink/5 disabled:opacity-30"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={busy || last}
          aria-label="Надолу"
          className="inline-flex h-6 w-6 items-center justify-center rounded text-ink-soft hover:bg-ink/5 disabled:opacity-30"
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {editing ? (
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={name}
            autoFocus
            disabled={busy}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
            className="!h-10 !py-2 sm:max-w-xs"
            aria-label="Име на статуса"
          />
          <ColorPicker value={color} onChange={setColor} disabled={busy} />
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <StatusBadge name={status.name} color={status.color} size="md" />
          <span className="text-xs text-ink-soft [font-variant-numeric:tabular-nums]">
            {count === 0 ? "никой" : count === 1 ? "1 човек" : `${count} души`}
          </span>
        </div>
      )}

      <div className="flex items-center gap-1">
        {editing ? (
          <>
            <button
              type="button"
              onClick={save}
              disabled={busy || !name.trim()}
              aria-label="Запази"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-forest-600 text-cream hover:bg-forest-700 disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setName(status.name);
                setColor(normalizeStatusColor(status.color));
              }}
              disabled={busy}
              aria-label="Откажи"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft hover:bg-ink/5"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setEditing(true)}
              disabled={busy}
              aria-label={`Редактирай ${status.name}`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft hover:bg-ink/5 hover:text-ink"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              aria-label={`Изтрий ${status.name}`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft hover:bg-coral-500/10 hover:text-coral-600"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          </>
        )}
      </div>
    </li>
  );
}

/** Main admin only: the list of statuses people in the list can carry. */
export function ContactStatusesManager({
  statuses,
  available,
  countByStatusId,
}: {
  statuses: ContactStatus[];
  available: boolean;
  countByStatusId: Record<string, number>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [color, setColor] = useState<StatusColor>("sky");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNote(null);
    startTransition(async () => {
      const res = await createContactStatus({ name, color });
      if (!res.ok) {
        setError(res.message ?? "Записът не успя.");
        return;
      }
      setName("");
      setNote(res.message ?? null);
      router.refresh();
    });
  }

  function move(index: number, dir: -1 | 1) {
    const ids = statuses.map((s) => s.id);
    const target = index + dir;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    startTransition(async () => {
      const res = await reorderContactStatuses(ids);
      if (!res.ok) setError(res.message ?? "Подреждането не успя.");
      else router.refresh();
    });
  }

  return (
    <Card title="Статуси на контактите">
      <p className="mb-5 max-w-2xl text-sm leading-relaxed text-ink-soft">
        Тук само главният админ добавя и подрежда статусите. Всеки от екипа с достъп до
        абонатите може да сложи статус на човек и да напише коментар - в таблицата и в профила
        се вижда кой го е сменил и кога.
      </p>

      {!available && (
        <Alert variant="warning" className="mb-5">
          Статусите още не са в базата - миграция 088 се пуска при deploy. След това тук ще
          можеш да ги добавяш.
        </Alert>
      )}

      <form
        onSubmit={add}
        className="mb-6 flex flex-col gap-3 rounded-2xl border border-ink/10 bg-cream/40 p-4 lg:flex-row lg:items-end"
      >
        <label className="block min-w-0 flex-1">
          <span className="mb-1.5 block text-sm font-medium text-ink">Нов статус</span>
          <Input
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            placeholder="напр. Обадено, Интересува се, Клиент"
            disabled={pending || !available}
          />
        </label>
        <div>
          <span className="mb-1.5 block text-sm font-medium text-ink">Цвят</span>
          <ColorPicker value={color} onChange={setColor} disabled={pending || !available} />
        </div>
        <AdminButton type="submit" disabled={pending || !available || !name.trim()}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Добави
        </AdminButton>
      </form>

      {error && <p className="mb-4 text-sm text-coral-700">{error}</p>}
      {note && <p className="mb-4 text-sm text-forest-700">{note}</p>}

      {statuses.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-ink/15 px-4 py-8 text-center text-sm text-ink-soft">
          Още няма статуси. Добави първия горе.
        </p>
      ) : (
        <ul className="divide-y divide-ink/5 overflow-hidden rounded-2xl border border-ink/10 bg-white">
          {statuses.map((status, i) => (
            <StatusRow
              key={`${status.id}-${status.updated_at}`}
              status={status}
              count={countByStatusId[status.id] ?? 0}
              first={i === 0}
              last={i === statuses.length - 1}
              disabled={pending}
              onMove={(dir) => move(i, dir)}
              onError={setError}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}
