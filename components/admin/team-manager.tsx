"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import {
  createAdminProfile,
  deleteAdminProfile,
  updateAdminProfile,
} from "@/app/(admin)/admin/team-actions";
import type { AdminProfileActivity } from "@/lib/admin/team-types";
import {
  ADMIN_SCREEN_GROUPS,
  adminScreenLabel,
  type AdminScreenKey,
} from "@/lib/admin/screens";
import { usernameRules } from "@/lib/admin/usernames";
import { formatAdminWhen } from "@/lib/admin/format-time";
import { AdminButton, Badge } from "@/components/admin/ui";
import { Card, Field, Input } from "@/components/admin/fields";
import { AuditActivityList } from "@/components/admin/audit-activity-list";
import { cn } from "@/lib/utils";

function ScreenPicker({
  value,
  onChange,
  disabled,
}: {
  value: AdminScreenKey[];
  onChange: (next: AdminScreenKey[]) => void;
  disabled?: boolean;
}) {
  function toggle(key: AdminScreenKey) {
    if (value.includes(key)) onChange(value.filter((item) => item !== key));
    else onChange([...value, key]);
  }

  return (
    <div className="space-y-4">
      {ADMIN_SCREEN_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-soft/70">
            {group.label}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.screens.map((screen) => {
              const checked = value.includes(screen.key);
              return (
                <label
                  key={screen.key}
                  className={cn(
                    "inline-flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
                    checked
                      ? "border-forest-500/40 bg-forest-500/10 text-forest-700"
                      : "border-ink/15 bg-white text-ink-soft hover:border-ink/25",
                    disabled && "cursor-not-allowed opacity-60",
                  )}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink/20 text-forest-600 focus:ring-forest-500/30"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggle(screen.key)}
                  />
                  <span>
                    <span className="block font-medium text-ink">{screen.label}</span>
                    <span className="block text-xs text-ink-soft">{screen.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function CreateProfileForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [screens, setScreens] = useState<AdminScreenKey[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    const res = await createAdminProfile({
      displayName,
      username,
      password,
      screens,
    });
    setPending(false);
    if (!res.ok) {
      setError(res.message || "Неуспешно създаване.");
      return;
    }
    setMessage(res.message || "Профилът е създаден.");
    setDisplayName("");
    setUsername("");
    setPassword("");
    setScreens([]);
    router.refresh();
  }

  return (
    <Card title="Нов профил">
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Име" htmlFor="new-admin-name">
            <Input
              id="new-admin-name"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Мария Иванова"
            />
          </Field>
          <Field label="Потребителско име" htmlFor="new-admin-username" hint={usernameRules()}>
            <Input
              id="new-admin-username"
              required
              autoComplete="off"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="maria"
            />
          </Field>
          <Field label="Парола" htmlFor="new-admin-password">
            <Input
              id="new-admin-password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
        </div>
        <div>
          <p className="mb-3 text-sm font-medium text-ink">Достъп по екрани</p>
          <ScreenPicker value={screens} onChange={setScreens} />
        </div>
        {error ? (
          <p className="text-sm text-coral-600" role="alert">
            {error}
          </p>
        ) : null}
        {message ? <p className="text-sm text-forest-700">{message}</p> : null}
        <AdminButton type="submit" disabled={pending}>
          <UserPlus className="h-4 w-4" aria-hidden />
          {pending ? "Създаване…" : "Създай профил"}
        </AdminButton>
      </form>
    </Card>
  );
}

function ProfileCard({ profile }: { profile: AdminProfileActivity }) {
  const router = useRouter();
  const isOwner = profile.role === "owner";
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [username, setUsername] = useState(profile.username);
  const [password, setPassword] = useState("");
  const [screens, setScreens] = useState<AdminScreenKey[]>(profile.screens);
  const [active, setActive] = useState(profile.active);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const screenLabels = useMemo(() => {
    if (isOwner) return ["Всички екрани"];
    return screens.map((key) => adminScreenLabel(key));
  }, [isOwner, screens]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await updateAdminProfile({
      id: profile.id,
      displayName,
      username,
      password,
      screens,
      active,
    });
    setPending(false);
    if (!res.ok) {
      setError(res.message || "Неуспешен запис.");
      return;
    }
    setPassword("");
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm(`Изтриване на профил ${profile.displayName}?`)) return;
    setPending(true);
    setError(null);
    const res = await deleteAdminProfile(profile.id);
    setPending(false);
    if (!res.ok) {
      setError(res.message || "Неуспешно изтриване.");
      return;
    }
    router.refresh();
  }

  return (
    <Card
      title={profile.displayName}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={profile.active ? "success" : "warning"}>
            {profile.active ? "активен" : "спрян"}
          </Badge>
          <Badge tone={isOwner ? "forest" : "neutral"}>
            {isOwner ? "главен админ" : "профил"}
          </Badge>
        </div>
      }
    >
      <p className="text-sm text-ink-soft">
        @{profile.username} · последно тук {formatAdminWhen(profile.lastSeenAt)} · вход{" "}
        {formatAdminWhen(profile.lastLoginAt)}
      </p>
      {profile.lastAction ? (
        <p className="mt-2 text-sm text-ink">
          Последно: {profile.lastAction.summary}{" "}
          <span className="text-ink-soft">
            ({formatAdminWhen(profile.lastAction.created_at)})
          </span>
        </p>
      ) : (
        <p className="mt-2 text-sm text-ink-soft">Все още няма записани промени.</p>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {screenLabels.map((label) => (
          <Badge key={label} tone="forest">
            {label}
          </Badge>
        ))}
      </div>

      {editing ? (
        <form onSubmit={save} className="mt-5 space-y-4 border-t border-ink/10 pt-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Име" htmlFor={`edit-name-${profile.id}`}>
              <Input
                id={`edit-name-${profile.id}`}
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </Field>
            <Field label="Потребителско име" htmlFor={`edit-username-${profile.id}`}>
              <Input
                id={`edit-username-${profile.id}`}
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </Field>
          </div>
          <Field
            label={isOwner ? "Нова парола (по желание)" : "Нова парола (по желание)"}
            htmlFor={`edit-password-${profile.id}`}
            hint={
              isOwner
                ? "Ако е празно, остава текущата. Главният админ винаги може да влезе и с основната ADMIN_SECRET парола."
                : "Ако е празно, паролата не се сменя."
            }
          >
            <Input
              id={`edit-password-${profile.id}`}
              type="password"
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {isOwner ? null : (
            <>
              <label className="inline-flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-ink/20 text-forest-600 focus:ring-forest-500/30"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />
                Активен профил
              </label>
              <ScreenPicker value={screens} onChange={setScreens} />
            </>
          )}
          {error ? (
            <p className="text-sm text-coral-600" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <AdminButton type="submit" disabled={pending}>
              {pending ? "Запис…" : "Запази"}
            </AdminButton>
            <AdminButton type="button" variant="secondary" onClick={() => setEditing(false)}>
              Отказ
            </AdminButton>
            {isOwner ? null : (
              <AdminButton type="button" variant="danger" disabled={pending} onClick={() => void remove()}>
                Изтрий
              </AdminButton>
            )}
          </div>
        </form>
      ) : (
        <div className="mt-5">
          <AdminButton type="button" variant="secondary" size="sm" onClick={() => setEditing(true)}>
            Редактирай
          </AdminButton>
        </div>
      )}

      <div className="mt-6 border-t border-ink/10 pt-5">
        <h3 className="mb-3 text-sm font-semibold text-ink">Последни промени</h3>
        <AuditActivityList
          items={profile.recent}
          showActor={false}
          empty="Няма скорошни действия от този профил."
        />
      </div>
    </Card>
  );
}

export function TeamManager({ profiles }: { profiles: AdminProfileActivity[] }) {
  return (
    <div className="space-y-6">
      <CreateProfileForm />
      {profiles.map((profile) => (
        <ProfileCard key={profile.id} profile={profile} />
      ))}
    </div>
  );
}
