"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Link2, Trash2, User, Mail } from "lucide-react";
import { Field, Input, Textarea } from "@/components/admin/fields";
import {
  insertAtCursor,
  makeEmailButtonMarker,
  moveEmailBodyButton,
  parseEmailBodyButtons,
  removeEmailBodyButton,
} from "@/lib/email/body-buttons";
import { cn } from "@/lib/utils";

export function EmailBodyEditor({
  label = "Съдържание",
  value,
  onChange,
  rows = 8,
  disabled,
  placeholder,
}: {
  label?: string;
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  disabled?: boolean;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [btnLabel, setBtnLabel] = useState("");
  const [btnHref, setBtnHref] = useState("");
  const [showBtnForm, setShowBtnForm] = useState(false);

  const buttons = parseEmailBodyButtons(value);

  function insert(text: string) {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const { value: next, caret } = insertAtCursor(value, text, start, end);
    onChange(next);
    requestAnimationFrame(() => {
      const node = ref.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(caret, caret);
    });
  }

  function addButton() {
    const labelText = btnLabel.trim();
    const href = btnHref.trim();
    if (!labelText || !href) return;
    const marker = makeEmailButtonMarker(labelText, href);
    const needsGap = value.length > 0 && !/\n\s*$/.test(value);
    insert(`${needsGap ? "\n\n" : ""}${marker}\n\n`);
    setBtnLabel("");
    setBtnHref("");
    setShowBtnForm(false);
  }

  return (
    <div className="space-y-3">
      <Field
        label={label}
        hint="Пиши нормално — новите редове се запазват. Ползвай бутоните по-долу вместо HTML."
      >
        <div className="mb-2 flex flex-wrap gap-2">
          <ToolbarButton
            disabled={disabled}
            onClick={() => insert("{{name}}")}
            icon={<User className="h-3.5 w-3.5" />}
            label="Име"
            title="Вмъква {{name}} — името на получателя"
          />
          <ToolbarButton
            disabled={disabled}
            onClick={() => insert("{{email}}")}
            icon={<Mail className="h-3.5 w-3.5" />}
            label="Имейл"
            title="Вмъква {{email}}"
          />
          <ToolbarButton
            disabled={disabled}
            onClick={() => setShowBtnForm((v) => !v)}
            icon={<Link2 className="h-3.5 w-3.5" />}
            label="Бутон"
            title="Добави бутон с текст и линк"
            active={showBtnForm}
          />
        </div>

        {showBtnForm && (
          <div className="mb-3 space-y-3 rounded-xl border border-ink/10 bg-cream/40 p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Текст на бутона">
                <Input
                  value={btnLabel}
                  onChange={(e) => setBtnLabel(e.target.value)}
                  placeholder="Напр. Запиши се"
                  disabled={disabled}
                />
              </Field>
              <Field label="Линк">
                <Input
                  value={btnHref}
                  onChange={(e) => setBtnHref(e.target.value)}
                  placeholder="https://… или /bg#contact"
                  disabled={disabled}
                />
              </Field>
            </div>
            <button
              type="button"
              disabled={disabled || !btnLabel.trim() || !btnHref.trim()}
              onClick={addButton}
              className="inline-flex h-9 items-center rounded-full bg-forest-600 px-4 text-sm font-semibold text-white hover:bg-forest-700 disabled:opacity-50"
            >
              Вмъкни бутона
            </button>
          </div>
        )}

        <Textarea
          ref={ref}
          rows={rows}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            placeholder ??
            "Здравей, {{name}}!\n\nТекстът ти тук…\nНов ред се вижда в имейла."
          }
          className="text-[14px] leading-relaxed"
        />
      </Field>

      {buttons.length > 0 && (
        <div className="rounded-xl border border-ink/10 p-3">
          <p className="text-sm font-semibold text-ink">Бутони в текста</p>
          <p className="mt-1 text-xs text-ink-soft">
            Подреди ги с стрелките — редът в списъка = редът в имейла.
          </p>
          <ul className="mt-3 space-y-2">
            {buttons.map((btn, i) => (
              <li
                key={`${btn.marker}-${i}`}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-ink/10 bg-white px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{btn.label}</p>
                  <p className="truncate text-xs text-ink-soft">{btn.href}</p>
                </div>
                <div className="flex items-center gap-1">
                  <IconBtn
                    disabled={disabled || i === 0}
                    onClick={() => onChange(moveEmailBodyButton(value, i, -1))}
                    label="Нагоре"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn
                    disabled={disabled || i === buttons.length - 1}
                    onClick={() => onChange(moveEmailBodyButton(value, i, 1))}
                    label="Надолу"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn
                    disabled={disabled}
                    onClick={() => onChange(removeEmailBodyButton(value, i))}
                    label="Премахни"
                    danger
                  >
                    <Trash2 className="h-4 w-4" />
                  </IconBtn>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ToolbarButton({
  label,
  icon,
  onClick,
  disabled,
  title,
  active,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors disabled:opacity-50",
        active
          ? "border-forest-500 bg-forest-50 text-forest-800"
          : "border-ink/15 bg-white text-ink hover:bg-cream",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function IconBtn({
  children,
  onClick,
  disabled,
  label,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-ink/10 text-ink-soft hover:bg-cream disabled:opacity-40",
        danger && "hover:bg-rose-50 hover:text-rose-700",
      )}
    >
      {children}
    </button>
  );
}
