"use client";

import { Wand2 } from "lucide-react";
import { Field, Input } from "@/components/admin/fields";
import { ShareLinksPanel } from "@/components/admin/share-links";
import {
  catalogSlug,
  normalizeCatalogLinkMode,
  type CatalogKind,
  type CatalogLinkMode,
  type ShareLink,
} from "@/lib/site/share-links";
import { cn } from "@/lib/utils";

const COPY = {
  guide: {
    prefix: "/bg/guides/",
    slugHint:
      "Това е адресът на ръководството. Празно = ползва се вътрешният номер, който не става за споделяне.",
    pageLabel: "Отваря страницата на ръководството",
    pageNote:
      "Посетителят вижда корицата, описанието и цената, и купува оттам. Най-добро за студен трафик.",
    directNote:
      "Stripe се отваря веднага. Страницата се прескача — за хора, които вече са решили.",
  },
  product: {
    prefix: "/bg/products/",
    slugHint:
      "Това е адресът на продукта. Празно = ползва се вътрешният номер, който не става за споделяне.",
    pageLabel: "Отваря страницата на продукта (с допълнителната оферта)",
    pageNote:
      "Посетителят минава през страницата, където върви настроената допълнителна оферта преди плащането.",
    directNote:
      "Stripe се отваря веднага. Страницата и допълнителната оферта се прескачат.",
  },
} as const;

function ModeOption({
  checked,
  onSelect,
  label,
  note,
  disabled,
}: {
  checked: boolean;
  onSelect: () => void;
  label: string;
  note: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer gap-2.5 rounded-xl border p-3 transition-colors",
        checked
          ? "border-forest-500/50 bg-forest-50/60"
          : "border-ink/10 bg-white hover:border-forest-500/30",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <input
        type="radio"
        className="mt-0.5"
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">{note}</span>
      </span>
    </label>
  );
}

/**
 * The link half of a catalogue editor: the address of the row's own page, what
 * its buttons do, and every link that can be copied out and sent somewhere.
 */
export function CatalogLinkEditor({
  kind,
  title,
  slug,
  onSlugChange,
  linkMode,
  onLinkModeChange,
  linkUrl,
  onLinkUrlChange,
  links,
  saved,
  disabled,
}: {
  kind: CatalogKind;
  /** Title the slug is generated from when the field is left empty. */
  title: string;
  slug: string;
  onSlugChange: (slug: string) => void;
  linkMode: string;
  onLinkModeChange: (mode: CatalogLinkMode) => void;
  linkUrl: string;
  onLinkUrlChange: (url: string) => void;
  /** Links of the row as it is saved right now — empty for a row not yet saved. */
  links: ShareLink[];
  /** False while editing a row that does not exist yet. */
  saved: boolean;
  disabled?: boolean;
}) {
  const copy = COPY[kind];
  const mode = normalizeCatalogLinkMode(linkMode);
  const suggestion = catalogSlug(title);

  return (
    <div className="space-y-4 rounded-xl border border-ink/10 bg-cream-2/20 p-4">
      <div>
        <p className="text-sm font-semibold text-ink">Линк</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-soft">
          Всяко нещо тук има собствен адрес, който можеш да копираш и пратиш където
          решиш — в съобщение, в реклама, в имейл.
        </p>
      </div>

      <Field label="Адрес на страницата" hint={copy.slugHint}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-ink-soft">{copy.prefix}</span>
          <Input
            value={slug}
            disabled={disabled}
            spellCheck={false}
            placeholder={suggestion || "moyat-link"}
            onChange={(e) => onSlugChange(e.target.value)}
            className="h-10 min-w-0 flex-1 py-2 font-mono text-xs"
          />
          {suggestion && suggestion !== slug && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSlugChange(suggestion)}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-ink/15 px-3 text-xs font-semibold text-ink-soft hover:border-forest-500/40 hover:bg-forest-50 hover:text-forest-700 disabled:opacity-60"
            >
              <Wand2 className="h-3.5 w-3.5" /> От заглавието
            </button>
          )}
        </div>
      </Field>

      <div className="space-y-2">
        <p className="text-sm font-medium text-ink">Накъде води бутонът</p>
        <ModeOption
          checked={mode === "page"}
          onSelect={() => onLinkModeChange("page")}
          label={copy.pageLabel}
          note={copy.pageNote}
          disabled={disabled}
        />
        <ModeOption
          checked={mode === "direct"}
          onSelect={() => onLinkModeChange("direct")}
          label="Директно към плащането"
          note={copy.directNote}
          disabled={disabled}
        />
        <ModeOption
          checked={mode === "custom"}
          onSelect={() => onLinkModeChange("custom")}
          label="Собствен линк"
          note="Води където напишеш — друга страница на сайта, форма, външен адрес."
          disabled={disabled}
        />
        {mode === "custom" && (
          <Field
            label="Собствен адрес"
            hint="Пълен адрес (https://…) или път от сайта (/bg/programs/…)."
          >
            <Input
              value={linkUrl}
              disabled={disabled}
              spellCheck={false}
              placeholder="https://..."
              onChange={(e) => onLinkUrlChange(e.target.value)}
            />
          </Field>
        )}
      </div>

      <ShareLinksPanel
        links={saved ? links : []}
        hint="Отбелязаният линк е този, към който водят картите и бутоните на сайта."
        empty="Запази, за да се появят линковете за копиране."
      />
    </div>
  );
}
