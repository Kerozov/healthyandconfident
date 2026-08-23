"use client";

import { Plus, Trash2 } from "lucide-react";
import type { FormTemplateRecord } from "@/lib/forms/types";
import type { SiteProduct } from "@/lib/supabase/types";
import { Field, Input, Select } from "@/components/admin/fields";
import { StripeHrefPicker } from "@/components/admin/stripe-locale-picker";
import { Segmented } from "@/components/admin/email-block-editors";
import { productSellableInLocale } from "@/lib/site/product-locale";
import {
  SIGNATURE_LINK_LIMIT,
  SIGNATURE_PAGE_OPTIONS,
  isSafeSignatureHref,
  newSignatureLink,
  type EmailSignatureLink,
  type SignatureLinkKind,
  type SignaturePageKey,
} from "@/lib/email/signature-links";

const KIND_OPTIONS: { value: SignatureLinkKind; label: string }[] = [
  { value: "page", label: "Страница" },
  { value: "product", label: "Продукт" },
  { value: "form", label: "Форма" },
  { value: "url", label: "Адрес" },
];

function pageLabel(page: SignaturePageKey | ""): string {
  return SIGNATURE_PAGE_OPTIONS.find((option) => option.value === page)?.label ?? "";
}

function productTitle(product: SiteProduct, locale: "bg" | "en"): string {
  return (locale === "en" ? product.title_en : product.title_bg) || product.title_bg;
}

function formTitle(
  form: Pick<FormTemplateRecord, "title_bg" | "title_en" | "name">,
  locale: "bg" | "en",
): string {
  return (locale === "en" ? form.title_en : form.title_bg) || form.name;
}

export function SignatureLinksEditor({
  locale,
  links,
  products,
  forms,
  onChange,
}: {
  locale: "bg" | "en";
  links: EmailSignatureLink[];
  products: SiteProduct[];
  forms: FormTemplateRecord[];
  onChange: (next: EmailSignatureLink[]) => void;
}) {
  function update(id: string, patch: Partial<EmailSignatureLink>) {
    onChange(links.map((link) => (link.id === id ? { ...link, ...patch } : link)));
  }

  function add() {
    if (links.length >= SIGNATURE_LINK_LIMIT) return;
    onChange([...links, newSignatureLink()]);
  }

  const sortedProducts = [...products].sort(
    (a, b) => a.sort_order - b.sort_order || a.title_bg.localeCompare(b.title_bg, "bg"),
  );
  const sortedForms = [...forms].sort((a, b) => a.name.localeCompare(b.name, "bg"));

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-ink">Линкове в подписа</p>
        <p className="mt-1 text-xs text-ink-soft">
          Показват се под телефона в личния подпис. Избери страница, продукт или
          форма — или сложи собствен адрес. Всеки може да е обикновен линк или бутон.
        </p>
      </div>

      {links.map((link, index) => {
        const hrefInvalid =
          link.kind === "url" &&
          Boolean(link.href.trim()) &&
          !isSafeSignatureHref(link.href);
        return (
          <div
            key={link.id}
            className="space-y-3 rounded-xl border border-ink/10 bg-white p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Линк {index + 1}
              </p>
              <button
                type="button"
                onClick={() => onChange(links.filter((item) => item.id !== link.id))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-coral-500/10 hover:text-coral-600"
                aria-label="Премахни линка"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <Field label="Текст">
              <Input
                value={link.label}
                onChange={(e) => update(link.id, { label: e.target.value })}
                placeholder="Напиши ми"
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Какво отваря">
                <Select
                  value={link.kind}
                  onChange={(e) => {
                    const kind = e.target.value as SignatureLinkKind;
                    const next: Partial<EmailSignatureLink> = { kind };
                    if (kind === "page" && !link.page) next.page = "contact";
                    update(link.id, next);
                  }}
                >
                  {KIND_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Изглед">
                <Segmented
                  value={link.appearance}
                  onChange={(appearance) => update(link.id, { appearance })}
                  options={[
                    { value: "link", label: "Линк" },
                    { value: "button", label: "Бутон" },
                  ]}
                />
              </Field>
            </div>

            {link.kind === "page" && (
              <Field label="Страница">
                <Select
                  value={link.page || "contact"}
                  onChange={(e) => {
                    const page = e.target.value as SignaturePageKey;
                    update(link.id, {
                      page,
                      label: link.label.trim() ? link.label : pageLabel(page),
                    });
                  }}
                >
                  {SIGNATURE_PAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            {link.kind === "product" && (
              <div className="space-y-3">
                <Field label="Продукт">
                  {sortedProducts.length === 0 ? (
                    <p className="text-sm text-ink-soft">
                      Няма продукти — добави ги в Website → Продукти.
                    </p>
                  ) : (
                    <Select
                      value={link.productId}
                      onChange={(e) => {
                        const productId = e.target.value;
                        const product = sortedProducts.find((item) => item.id === productId);
                        update(link.id, {
                          productId,
                          label:
                            link.label.trim() || !product
                              ? link.label
                              : productTitle(product, locale),
                        });
                      }}
                    >
                      <option value="">Избери продукт</option>
                      {sortedProducts.map((product) => (
                        <option
                          key={product.id}
                          value={product.id}
                          disabled={!productSellableInLocale(product, locale)}
                        >
                          {productTitle(product, locale)}
                          {productSellableInLocale(product, locale)
                            ? ""
                            : " — няма Stripe цена"}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label="Накъде води">
                  <Segmented
                    value={link.productLinkMode}
                    onChange={(productLinkMode) =>
                      update(link.id, { productLinkMode })
                    }
                    options={[
                      { value: "site", label: "Към сайта" },
                      { value: "stripe", label: "Към Stripe" },
                    ]}
                  />
                </Field>
              </div>
            )}

            {link.kind === "form" && (
              <Field label="Форма">
                {sortedForms.length === 0 ? (
                  <p className="text-sm text-ink-soft">
                    Няма форми — създай ги в Admin → Форми.
                  </p>
                ) : (
                  <Select
                    value={link.formId}
                    onChange={(e) => {
                      const formId = e.target.value;
                      const form = sortedForms.find((item) => item.id === formId);
                      update(link.id, {
                        formId,
                        label:
                          link.label.trim() || !form
                            ? link.label
                            : formTitle(form, locale),
                      });
                    }}
                  >
                    <option value="">Избери форма</option>
                    {sortedForms.map((form) => (
                      <option key={form.id} value={form.id}>
                        {formTitle(form, locale)}
                        {form.enabled ? "" : " — скрита (с покана)"}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            )}

            {link.kind === "url" && (
              <Field label="Адрес">
                <div className="space-y-3">
                  <StripeHrefPicker
                    href={link.href}
                    onHrefChange={(href) => update(link.id, { href })}
                  />
                  <Input
                    value={link.href}
                    onChange={(e) => update(link.id, { href: e.target.value })}
                    placeholder="https://… или /bg#contact"
                    className={hrefInvalid ? "border-coral-500" : undefined}
                  />
                </div>
                {hrefInvalid ? (
                  <p className="mt-1 text-xs text-coral-600">
                    Линкът трябва да започва с https://, mailto:, tel: или /
                  </p>
                ) : null}
              </Field>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={add}
        disabled={links.length >= SIGNATURE_LINK_LIMIT}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-ink/15 bg-white px-4 text-sm font-semibold text-ink hover:border-forest-500/40 disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
        Добави линк
      </button>
    </div>
  );
}
