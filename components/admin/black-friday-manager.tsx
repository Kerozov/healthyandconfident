"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Save, Trash2, X } from "lucide-react";
import type {
  BlackFridayBundle,
  BlackFridayDiscount,
  SiteBlackFridayConfig,
} from "@/lib/supabase/types";
import type { BlackFridayAdminItem } from "@/lib/black-friday/admin";
import {
  BUNDLE_MAX_ITEMS,
  BUNDLE_MIN_ITEMS,
  allocateBundleAmounts,
  bundleFinalAmount,
  discountedAmount,
  savedPercent,
  type BlackFridayBundlePriceType,
  type BlackFridayDiscountType,
  type BlackFridayItemKind,
} from "@/lib/black-friday/pricing";
import {
  deleteBlackFridayBundle,
  deleteBlackFridayDiscount,
  saveBlackFridayBundle,
  saveBlackFridayConfig,
  saveBlackFridayDiscount,
} from "@/app/(admin)/admin/black-friday-actions";
import { Card, Field, Input, Select, Textarea } from "@/components/admin/fields";
import { AdminButton, Alert } from "@/components/admin/ui";
import { formatCents } from "@/lib/site/price-format";

const KIND_LABEL: Record<BlackFridayItemKind, string> = {
  product: "Оферта",
  guide: "Ръководство",
  program: "Програма",
};

const GROUP_LABEL: Record<BlackFridayItemKind, string> = {
  product: "Оферти",
  guide: "Ръководства",
  program: "Програми",
};

const KIND_ORDER: BlackFridayItemKind[] = ["program", "product", "guide"];

function eur(cents: number): string {
  return formatCents(cents, "eur", "bg");
}

function toLocalInput(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

/**
 * `datetime-local` gives a wall-clock time without a zone; turn it into an
 * instant in the admin's browser zone (Sofia) before saving, so the database
 * doesn't read „30.11 23:59“ as UTC.
 */
function fromLocalInput(value: string): string {
  if (!value.trim()) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toISOString();
}

function useAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function run(
    action: () => Promise<{ ok: boolean; message?: string }>,
    success = "Запазено",
  ) {
    setMessage(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) {
        setMessage({ ok: false, text: res.message || "Неуспешно" });
        return;
      }
      setMessage({ ok: true, text: success });
      router.refresh();
    });
  }

  return { pending, message, setMessage, run };
}

function Status({ message }: { message: { ok: boolean; text: string } | null }) {
  if (!message) return null;
  return (
    <p
      role={message.ok ? "status" : "alert"}
      className={`text-sm ${message.ok ? "text-forest-700" : "text-coral-700"}`}
    >
      {message.text}
    </p>
  );
}

function KindChip({ kind }: { kind: BlackFridayItemKind }) {
  return (
    <span className="rounded-full bg-forest-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-forest-700">
      {KIND_LABEL[kind]}
    </span>
  );
}

/** Items grouped by kind for a `<select>`; unusable ones are shown but disabled. */
function ItemOptions({
  items,
  exclude,
}: {
  items: BlackFridayAdminItem[];
  exclude: Set<string>;
}) {
  return (
    <>
      {KIND_ORDER.map((kind) => {
        const group = items.filter((item) => item.kind === kind && !exclude.has(item.key));
        if (group.length === 0) return null;
        return (
          <optgroup key={kind} label={GROUP_LABEL[kind]}>
            {group.map((item) => (
              <option key={item.key} value={item.key} disabled={Boolean(item.problem)}>
                {item.label}
                {item.regularCents !== null ? ` · ${eur(item.regularCents)}` : ""}
                {item.problem ? ` (${item.problem})` : ""}
              </option>
            ))}
          </optgroup>
        );
      })}
    </>
  );
}

// ── Campaign ─────────────────────────────────────────────────────────────────

function CampaignEditor({
  config,
  siteOrigin,
}: {
  config: SiteBlackFridayConfig | null;
  siteOrigin: string;
}) {
  const { pending, message, setMessage, run } = useAction();
  const [form, setForm] = useState({
    enabled: config?.enabled ?? false,
    // Defaults follow the 2026 plan: offers 27.11 8:00 – 30.11 23:59.
    deadline: config ? toLocalInput(config.deadline) : "2026-11-30T23:59",
    early_access_deadline: config
      ? toLocalInput(config.early_access_deadline)
      : "2026-11-27T08:00",
    early_access_form_slug: config?.early_access_form_slug ?? "",
    banner_text_bg:
      config?.banner_text_bg ?? "Черен петък: менюта и програми до −50% до 30.11",
    banner_text_en:
      config?.banner_text_en ?? "Black Friday: menus and programs up to −50% until 30.11",
    banner_href: config?.banner_href ?? "/black-friday",
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setMessage(null);
  }

  const earlyLink = config?.early_access_key
    ? `${siteOrigin}/bg/black-friday?early=${config.early_access_key}`
    : "";

  return (
    <Card title="Кампания" className="space-y-4">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={form.enabled}
          onChange={(e) => set("enabled", e.target.checked)}
        />
        Кампанията е активна (показва страницата и лентата)
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Начало на офертите"
          hint="До този момент страницата показва само формата за ранен достъп (освен по тайния линк по-долу)."
        >
          <Input
            type="datetime-local"
            value={form.early_access_deadline}
            onChange={(e) => set("early_access_deadline", e.target.value)}
          />
        </Field>
        <Field
          label="Край на офертите"
          hint="След този момент цените се връщат. Времето е в българската часова зона."
        >
          <Input
            type="datetime-local"
            value={form.deadline}
            onChange={(e) => set("deadline", e.target.value)}
          />
        </Field>
      </div>

      {earlyLink && (
        <Field
          label="Линк за ранен достъп"
          hint="Сложи го в имейла преди старта. Който го има, вижда и купува офертите преди началото."
        >
          <Input readOnly value={earlyLink} onFocus={(e) => e.currentTarget.select()} />
        </Field>
      )}

      <Field
        label="Slug на формата за ранен достъп"
        hint="Името на формата в Админ → Форми. Оставено празно = няма форма."
      >
        <Input
          value={form.early_access_form_slug}
          onChange={(e) => set("early_access_form_slug", e.target.value)}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Текст на лентата (БГ)">
          <Input value={form.banner_text_bg} onChange={(e) => set("banner_text_bg", e.target.value)} />
        </Field>
        <Field label="Текст на лентата (EN)">
          <Input value={form.banner_text_en} onChange={(e) => set("banner_text_en", e.target.value)} />
        </Field>
      </div>

      <Field label="Линк на лентата" hint="Път без езика, напр. /black-friday">
        <Input value={form.banner_href} onChange={(e) => set("banner_href", e.target.value)} />
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <AdminButton
          disabled={pending}
          onClick={() =>
            run(() =>
              saveBlackFridayConfig({
                enabled: form.enabled,
                deadline: fromLocalInput(form.deadline),
                early_access_deadline: fromLocalInput(form.early_access_deadline),
                early_access_form_slug: form.early_access_form_slug,
                banner_text_bg: form.banner_text_bg,
                banner_text_en: form.banner_text_en,
                banner_href: form.banner_href,
              }),
            )
          }
        >
          <Save className="h-4 w-4" /> Запази кампанията
        </AdminButton>
        <Status message={message} />
      </div>
    </Card>
  );
}

// ── Discounts ────────────────────────────────────────────────────────────────

const DISCOUNT_TYPES: { value: BlackFridayDiscountType; label: string; unit: string }[] = [
  { value: "percent", label: "Процент отстъпка", unit: "%" },
  { value: "amount", label: "Сума отстъпка", unit: "€" },
  { value: "price", label: "Нова цена", unit: "€" },
];

function discountPreview(
  item: BlackFridayAdminItem | undefined,
  type: BlackFridayDiscountType,
  value: string,
): { text: string; ok: boolean } | null {
  if (!item || item.regularCents === null) return null;
  const final = discountedAmount(item.regularCents, type, Number(value.replace(",", ".")));
  if (final === null) return { text: "няма реална отстъпка", ok: false };
  return {
    text: `${eur(item.regularCents)} → ${eur(final)} (−${savedPercent(item.regularCents, final)}%)`,
    ok: true,
  };
}

function DiscountRow({
  discount,
  item,
}: {
  discount: BlackFridayDiscount;
  item: BlackFridayAdminItem | undefined;
}) {
  const { pending, message, setMessage, run } = useAction();
  const [type, setType] = useState<BlackFridayDiscountType>(discount.discount_type);
  const [value, setValue] = useState(String(discount.discount_value));
  const [enabled, setEnabled] = useState(discount.enabled);
  const preview = discountPreview(item, type, value);

  return (
    <li className="space-y-3 rounded-2xl border border-ink/10 p-4">
      <div className="flex flex-wrap items-center gap-2">
        {item && <KindChip kind={item.kind} />}
        <p className="font-medium text-ink">{item?.label ?? "Изтрит продукт"}</p>
        {item?.problem && (
          <span className="text-xs text-coral-700">· {item.problem}</span>
        )}
      </div>
      <div className="grid items-end gap-3 sm:grid-cols-[1fr_8rem_auto]">
        <Field label="Вид">
          <Select
            value={type}
            onChange={(e) => {
              setType(e.target.value as BlackFridayDiscountType);
              setMessage(null);
            }}
          >
            {DISCOUNT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={DISCOUNT_TYPES.find((t) => t.value === type)?.unit === "%" ? "Процент" : "Евро"}>
          <Input
            inputMode="decimal"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setMessage(null);
            }}
          />
        </Field>
        <label className="flex h-11 items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => {
              setEnabled(e.target.checked);
              setMessage(null);
            }}
          />
          Активна
        </label>
      </div>
      {preview && (
        <p className={`text-sm ${preview.ok ? "text-ink" : "text-coral-700"}`}>{preview.text}</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <AdminButton
          size="sm"
          disabled={pending}
          onClick={() =>
            run(() =>
              saveBlackFridayDiscount({
                item_key: discount.item_key,
                discount_type: type,
                discount_value: Number(value.replace(",", ".")),
                enabled,
              }),
            )
          }
        >
          <Check className="h-4 w-4" /> Запази
        </AdminButton>
        <AdminButton
          size="sm"
          variant="danger"
          disabled={pending}
          onClick={() => {
            if (!window.confirm("Махаш отстъпката от Черния петък. Продължаваме?")) return;
            run(() => deleteBlackFridayDiscount(discount.item_key), "Махната");
          }}
        >
          <Trash2 className="h-4 w-4" /> Махни
        </AdminButton>
        <Status message={message} />
      </div>
    </li>
  );
}

function DiscountsEditor({
  discounts,
  items,
}: {
  discounts: BlackFridayDiscount[];
  items: BlackFridayAdminItem[];
}) {
  const byKey = useMemo(() => new Map(items.map((item) => [item.key, item])), [items]);
  const taken = useMemo(() => new Set(discounts.map((d) => d.item_key)), [discounts]);
  const { pending, message, run } = useAction();
  const [newKey, setNewKey] = useState("");
  const [newType, setNewType] = useState<BlackFridayDiscountType>("percent");
  const [newValue, setNewValue] = useState("30");
  const preview = discountPreview(byKey.get(newKey), newType, newValue);

  return (
    <Card title="Отстъпки на отделни продукти" className="space-y-4">
      <p className="text-sm text-ink-soft">
        Избери програма, оферта или ръководство и сложи отстъпка. Редовната цена идва от
        Stripe, а при плащане Stripe взима новата цена - не е нужен нов линк.
      </p>

      {discounts.length > 0 && (
        <ul className="space-y-3">
          {discounts.map((discount) => (
            <DiscountRow
              key={`${discount.item_key}:${discount.updated_at}`}
              discount={discount}
              item={byKey.get(discount.item_key)}
            />
          ))}
        </ul>
      )}

      <div className="space-y-3 rounded-2xl bg-cream p-4">
        <p className="text-sm font-semibold text-ink">Нова отстъпка</p>
        <div className="grid items-end gap-3 lg:grid-cols-[1fr_12rem_8rem]">
          <Field label="Продукт">
            <Select value={newKey} onChange={(e) => setNewKey(e.target.value)}>
              <option value="">Избери…</option>
              <ItemOptions items={items} exclude={taken} />
            </Select>
          </Field>
          <Field label="Вид">
            <Select
              value={newType}
              onChange={(e) => setNewType(e.target.value as BlackFridayDiscountType)}
            >
              {DISCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={newType === "percent" ? "Процент" : "Евро"}>
            <Input
              inputMode="decimal"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
            />
          </Field>
        </div>
        {preview && (
          <p className={`text-sm ${preview.ok ? "text-ink" : "text-coral-700"}`}>{preview.text}</p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <AdminButton
            disabled={pending || !newKey}
            onClick={() =>
              run(async () => {
                const res = await saveBlackFridayDiscount({
                  item_key: newKey,
                  discount_type: newType,
                  discount_value: Number(newValue.replace(",", ".")),
                  enabled: true,
                });
                if (res.ok) setNewKey("");
                return res;
              }, "Добавена")
            }
          >
            <Plus className="h-4 w-4" /> Добави отстъпката
          </AdminButton>
          <Status message={message} />
        </div>
      </div>
    </Card>
  );
}

// ── Bundles ──────────────────────────────────────────────────────────────────

type BundleForm = {
  title_bg: string;
  title_en: string;
  description_bg: string;
  description_en: string;
  badge_bg: string;
  badge_en: string;
  item_keys: string[];
  price_type: BlackFridayBundlePriceType;
  price_value: string;
  enabled: boolean;
};

function bundleToForm(bundle: BlackFridayBundle | null): BundleForm {
  return {
    title_bg: bundle?.title_bg ?? "",
    title_en: bundle?.title_en ?? "",
    description_bg: bundle?.description_bg ?? "",
    description_en: bundle?.description_en ?? "",
    badge_bg: bundle?.badge_bg ?? "",
    badge_en: bundle?.badge_en ?? "",
    item_keys: bundle?.item_keys ?? [],
    price_type: bundle?.price_type ?? "price",
    price_value: bundle ? String(bundle.price_value) : "",
    enabled: bundle?.enabled ?? false,
  };
}

function BundlePreview({
  form,
  byKey,
}: {
  form: BundleForm;
  byKey: Map<string, BlackFridayAdminItem>;
}) {
  const picked = form.item_keys.map((key) => byKey.get(key));
  if (picked.length < BUNDLE_MIN_ITEMS) {
    return <p className="text-sm text-ink-soft">Добави поне {BUNDLE_MIN_ITEMS} продукта.</p>;
  }
  if (picked.some((item) => !item || item.regularCents === null)) {
    return (
      <p className="text-sm text-coral-700">
        Някой от продуктите няма използваема цена - комплектът няма да се покаже.
      </p>
    );
  }
  const amounts = picked.map((item) => item!.regularCents!);
  const total = amounts.reduce((sum, value) => sum + value, 0);
  const final = bundleFinalAmount(
    total,
    amounts.length,
    form.price_type,
    Number(form.price_value.replace(",", ".")),
  );
  if (final === null) {
    return (
      <p className="text-sm text-coral-700">
        Поотделно: {eur(total)}. Цената на комплекта трябва да е по-ниска.
      </p>
    );
  }
  const shares = allocateBundleAmounts(amounts, final);
  return (
    <div className="space-y-1 text-sm text-ink">
      <p>
        Поотделно <del>{eur(total)}</del> → <strong>{eur(final)}</strong> (−
        {savedPercent(total, final)}%)
      </p>
      <p className="text-xs text-ink-soft">
        В Stripe всеки продукт е на отделен ред:{" "}
        {picked.map((item, i) => `${item!.label} ${eur(shares[i])}`).join(" · ")}
      </p>
    </div>
  );
}

function BundleEditor({
  bundle,
  items,
  byKey,
  onCreated,
}: {
  bundle: BlackFridayBundle | null;
  items: BlackFridayAdminItem[];
  byKey: Map<string, BlackFridayAdminItem>;
  onCreated?: () => void;
}) {
  const { pending, message, setMessage, run } = useAction();
  const [form, setForm] = useState<BundleForm>(() => bundleToForm(bundle));
  const [adding, setAdding] = useState("");

  function set<K extends keyof BundleForm>(key: K, value: BundleForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setMessage(null);
  }

  function save() {
    run(async () => {
      const res = await saveBlackFridayBundle({
        id: bundle?.id ?? null,
        ...form,
        price_value: Number(form.price_value.replace(",", ".")),
      });
      if (res.ok && !bundle) onCreated?.();
      return res;
    });
  }

  return (
    <Card
      title={bundle ? form.title_bg || "Комплект" : "Нов комплект"}
      className="space-y-4"
      action={
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => set("enabled", e.target.checked)}
          />
          Показан на сайта
        </label>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Заглавие (БГ)">
          <Input value={form.title_bg} onChange={(e) => set("title_bg", e.target.value)} />
        </Field>
        <Field label="Заглавие (EN)" hint="Празно = комплектът не се показва на английския сайт.">
          <Input value={form.title_en} onChange={(e) => set("title_en", e.target.value)} />
        </Field>
        <Field label="Описание (БГ)">
          <Textarea
            rows={3}
            value={form.description_bg}
            onChange={(e) => set("description_bg", e.target.value)}
          />
        </Field>
        <Field label="Описание (EN)">
          <Textarea
            rows={3}
            value={form.description_en}
            onChange={(e) => set("description_en", e.target.value)}
          />
        </Field>
        <Field label="Етикет (БГ)" hint="Напр. „Най-изгодно“. По желание.">
          <Input value={form.badge_bg} onChange={(e) => set("badge_bg", e.target.value)} />
        </Field>
        <Field label="Етикет (EN)">
          <Input value={form.badge_en} onChange={(e) => set("badge_en", e.target.value)} />
        </Field>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-ink">
          Продукти в комплекта ({form.item_keys.length}/{BUNDLE_MAX_ITEMS})
        </p>
        {form.item_keys.length > 0 && (
          <ul className="space-y-2">
            {form.item_keys.map((key) => {
              const item = byKey.get(key);
              return (
                <li
                  key={key}
                  className="flex items-center gap-2 rounded-xl border border-ink/10 px-3 py-2"
                >
                  {item && <KindChip kind={item.kind} />}
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">
                    {item?.label ?? "Изтрит продукт"}
                  </span>
                  <span className="text-sm text-ink-soft">
                    {item?.regularCents != null ? eur(item.regularCents) : item?.problem}
                  </span>
                  <button
                    type="button"
                    aria-label="Махни от комплекта"
                    className="rounded-full p-1 text-ink-soft hover:bg-ink/5 hover:text-ink"
                    onClick={() => set("item_keys", form.item_keys.filter((k) => k !== key))}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {form.item_keys.length < BUNDLE_MAX_ITEMS && (
          <Select
            value={adding}
            onChange={(e) => {
              const key = e.target.value;
              if (key) set("item_keys", [...form.item_keys, key]);
              setAdding("");
            }}
          >
            <option value="">+ Добави продукт…</option>
            <ItemOptions items={items} exclude={new Set(form.item_keys)} />
          </Select>
        )}
      </div>

      <div className="grid items-end gap-4 sm:grid-cols-2">
        <Field label="Цена на комплекта">
          <Select
            value={form.price_type}
            onChange={(e) => set("price_type", e.target.value as BlackFridayBundlePriceType)}
          >
            <option value="price">Крайна цена в евро</option>
            <option value="percent">Процент от сбора</option>
          </Select>
        </Field>
        <Field label={form.price_type === "percent" ? "Процент отстъпка" : "Евро"}>
          <Input
            inputMode="decimal"
            value={form.price_value}
            onChange={(e) => set("price_value", e.target.value)}
          />
        </Field>
      </div>

      <BundlePreview form={form} byKey={byKey} />

      <div className="flex flex-wrap items-center gap-3">
        <AdminButton disabled={pending} onClick={save}>
          <Save className="h-4 w-4" /> {bundle ? "Запази комплекта" : "Създай комплекта"}
        </AdminButton>
        {bundle && (
          <AdminButton
            variant="danger"
            disabled={pending}
            onClick={() => {
              if (!window.confirm("Изтриваш този комплект. Продължаваме?")) return;
              run(() => deleteBlackFridayBundle(bundle.id), "Изтрит");
            }}
          >
            <Trash2 className="h-4 w-4" /> Изтрий
          </AdminButton>
        )}
        <Status message={message} />
      </div>
    </Card>
  );
}

export function BlackFridayManager({
  config,
  discounts,
  bundles,
  items,
  tablesError,
  siteOrigin,
}: {
  config: SiteBlackFridayConfig | null;
  discounts: BlackFridayDiscount[];
  bundles: BlackFridayBundle[];
  items: BlackFridayAdminItem[];
  tablesError: string | null;
  siteOrigin: string;
}) {
  const byKey = useMemo(() => new Map(items.map((item) => [item.key, item])), [items]);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-6">
      <CampaignEditor config={config} siteOrigin={siteOrigin} />

      {tablesError ? (
        <Alert variant="warning">
          Отстъпките и комплектите още не са в базата (миграция 096). Ще се появят след
          качването ѝ. ({tablesError})
        </Alert>
      ) : (
        <>
          <DiscountsEditor discounts={discounts} items={items} />

          <div className="space-y-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">Комплекти</h2>
              <p className="mt-1 text-sm text-ink-soft">
                {BUNDLE_MIN_ITEMS}-{BUNDLE_MAX_ITEMS} продукта на една обща цена. Ако някой
                продукт спре да се продава, комплектът изчезва от сайта сам.
              </p>
            </div>
            {bundles.map((bundle) => (
              <BundleEditor
                key={`${bundle.id}:${bundle.updated_at}`}
                bundle={bundle}
                items={items}
                byKey={byKey}
              />
            ))}
            {creating ? (
              <BundleEditor
                bundle={null}
                items={items}
                byKey={byKey}
                onCreated={() => setCreating(false)}
              />
            ) : (
              <AdminButton variant="secondary" onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" /> Нов комплект
              </AdminButton>
            )}
          </div>
        </>
      )}
    </div>
  );
}
