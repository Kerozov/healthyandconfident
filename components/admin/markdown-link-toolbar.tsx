"use client";

import { useState, type RefObject } from "react";
import { Link2, MousePointerClick, X } from "lucide-react";
import { Field, Input, Select } from "@/components/admin/fields";
import { PROGRAM_LINK_OPTIONS } from "@/lib/site/program-cards";
import { MARKDOWN_BUTTON_TITLE } from "@/lib/site/markdown-links";
import { cn } from "@/lib/utils";

const OTHER = "__other__";

type Kind = "link" | "button";

/**
 * „Линк“ and „Бутон“ above the post's Markdown: pick a page of the site or
 * type an address, and the Markdown for it lands at the cursor — so nobody
 * has to remember that a button is a link whose title says `button`.
 */
export function MarkdownLinkToolbar({
  textareaRef,
  value,
  onChange,
}: {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string) => void;
}) {
  const [kind, setKind] = useState<Kind | null>(null);
  const [text, setText] = useState("");
  const [page, setPage] = useState(PROGRAM_LINK_OPTIONS[0]?.value ?? OTHER);
  const [url, setUrl] = useState("");
  const [outline, setOutline] = useState(false);

  function open(next: Kind) {
    const el = textareaRef.current;
    const selected = el ? value.slice(el.selectionStart, el.selectionEnd) : "";
    setText(selected.trim());
    setKind(next);
  }

  function insert() {
    const href = (page === OTHER ? url : page).trim();
    const label = text.trim() || href;
    if (!href) return;

    const title =
      kind === "button"
        ? ` "${MARKDOWN_BUTTON_TITLE[outline ? "button-outline" : "button"]}"`
        : "";
    let snippet = `[${label}](${href}${title})`;

    const el = textareaRef.current;
    const start = el ? el.selectionStart : value.length;
    const end = el ? el.selectionEnd : value.length;
    const before = value.slice(0, start);
    const after = value.slice(end);

    // A button sits on its own line; a link goes wherever the cursor is.
    if (kind === "button") {
      if (before && !/\n\s*\n$/.test(before)) {
        snippet = (before.endsWith("\n") ? "\n" : "\n\n") + snippet;
      }
      if (after && !/^\s*\n/.test(after)) snippet += "\n\n";
    }

    onChange(before + snippet + after);
    setKind(null);
    setUrl("");

    // Put the cursor after what was inserted once React has drawn it.
    const caret = before.length + snippet.length;
    requestAnimationFrame(() => {
      const node = textareaRef.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(caret, caret);
    });
  }

  return (
    <div className="mb-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <ToolbarButton active={kind === "link"} onClick={() => open("link")}>
          <Link2 className="h-3.5 w-3.5" /> Линк
        </ToolbarButton>
        <ToolbarButton active={kind === "button"} onClick={() => open("button")}>
          <MousePointerClick className="h-3.5 w-3.5" /> Бутон
        </ToolbarButton>
        <span className="text-xs text-ink-soft">
          Маркирай текст и натисни, или просто вмъкни на мястото на курсора.
        </span>
      </div>

      {kind && (
        <div className="space-y-3 rounded-xl border border-forest-500/30 bg-forest-50/40 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">
              {kind === "button" ? "Нов бутон" : "Нов линк"}
            </p>
            <button
              type="button"
              onClick={() => setKind(null)}
              className="rounded-full p-1 text-ink-soft hover:bg-ink/5 hover:text-ink"
              aria-label="Затвори"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={kind === "button" ? "Текст на бутона" : "Текст на линка"}>
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={kind === "button" ? "Запиши се" : "виж програмата"}
                className="py-2"
              />
            </Field>
            <Field
              label="Накъде води"
              hint="Езикът се добавя сам — „/programs/21-dni“ отваря /bg/programs/21-dni на българския сайт."
            >
              <Select
                value={page}
                onChange={(e) => setPage(e.target.value)}
                className="py-2"
              >
                {PROGRAM_LINK_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
                <option value={OTHER}>Друг адрес…</option>
              </Select>
            </Field>
          </div>

          {page === OTHER && (
            <Field
              label="Адрес"
              hint="Пълен адрес (https://…) или път от сайта (/products/…)."
            >
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://… или /products/moyat-produkt"
                spellCheck={false}
                className="py-2 font-mono text-xs"
              />
            </Field>
          )}

          {kind === "button" && (
            <div className="flex flex-wrap gap-2">
              <StyleOption checked={!outline} onSelect={() => setOutline(false)}>
                Плътен (основен)
              </StyleOption>
              <StyleOption checked={outline} onSelect={() => setOutline(true)}>
                С контур (второстепенен)
              </StyleOption>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={insert}
              disabled={page === OTHER && !url.trim()}
              className="inline-flex h-9 items-center rounded-full bg-forest-500 px-4 text-sm font-semibold text-white hover:bg-forest-600 disabled:opacity-60"
            >
              Вмъкни
            </button>
            <code className="truncate text-xs text-ink-soft">
              [{text.trim() || "текст"}]({(page === OTHER ? url : page) || "адрес"}
              {kind === "button"
                ? ` "${MARKDOWN_BUTTON_TITLE[outline ? "button-outline" : "button"]}"`
                : ""}
              )
            </code>
          </div>
        </div>
      )}
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-forest-500/50 bg-forest-50 text-forest-700"
          : "border-ink/15 hover:bg-ink/5",
      )}
    >
      {children}
    </button>
  );
}

function StyleOption({
  checked,
  onSelect,
  children,
}: {
  checked: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm",
        checked ? "border-forest-500/50 bg-white" : "border-ink/10 bg-white/60",
      )}
    >
      <input type="radio" checked={checked} onChange={onSelect} />
      {children}
    </label>
  );
}
