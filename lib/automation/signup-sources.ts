import { PROGRAM_LANDING_SLUGS } from "@/lib/programs/types";

export type SignupSourceOption = {
  value: string;
  label: string;
};

export type SignupSourceGroup = {
  id: string;
  label: string;
  options: SignupSourceOption[];
};

const STATIC_GROUPS: SignupSourceGroup[] = [
  {
    id: "free-menu",
    label: "Безплатно меню",
    options: [
      { value: "free-menu-banner", label: "Банер „Безплатно меню“" },
      { value: "lead-magnet", label: "Lead magnet секция" },
      { value: "menu-popup", label: "Popup — меню (ръчно)" },
      { value: "auto-popup", label: "Popup — автоматичен" },
    ],
  },
  {
    id: "popup",
    label: "Popup / общо",
    options: [{ value: "popup", label: "Общ popup (по подразбиране)" }],
  },
  {
    id: "nav",
    label: "Навигация и hero",
    options: [
      { value: "nav-header", label: "Навигация — desktop" },
      { value: "nav-mobile", label: "Навигация — mobile" },
      { value: "hero", label: "Hero секция" },
    ],
  },
  {
    id: "programs",
    label: "Страници за програми",
    options: PROGRAM_LANDING_SLUGS.map((slug) => ({
      value: `program-${slug}`,
      label: `Програма: ${slug}`,
    })),
  },
];

export function buildSignupSourceGroups(
  forms: { slug: string; name: string; title_bg: string }[],
): SignupSourceGroup[] {
  const formGroup: SignupSourceGroup = {
    id: "forms",
    label: "Форми",
    options: forms.map((f) => ({
      value: `form:${f.slug}`,
      label: f.title_bg?.trim() || f.name || f.slug,
    })),
  };

  return [...STATIC_GROUPS, ...(formGroup.options.length > 0 ? [formGroup] : [])];
}

const LABEL_BY_VALUE = new Map<string, string>();
for (const group of STATIC_GROUPS) {
  for (const opt of group.options) {
    LABEL_BY_VALUE.set(opt.value, opt.label);
  }
}

export function labelSignupSource(
  value: string,
  forms?: { slug: string; name: string; title_bg: string }[],
): string {
  const known = LABEL_BY_VALUE.get(value);
  if (known) return known;

  if (value.startsWith("form:")) {
    const slug = value.slice(5);
    const form = forms?.find((f) => f.slug === slug);
    if (form) return `Форма: ${form.title_bg || form.name || slug}`;
    return `Форма: ${slug}`;
  }

  if (value.startsWith("program-")) {
    return `Програма: ${value.slice(8)}`;
  }

  return value;
}

/** Empty required list = any signup source. */
export function signupSourceMatches(required: string[], actual?: string | null): boolean {
  const filters = required.filter(Boolean);
  if (filters.length === 0) return true;

  const source = (actual ?? "").trim().toLowerCase();
  if (!source) return false;

  return filters.some((req) => {
    const r = req.trim().toLowerCase();
    if (!r) return false;
    if (r.endsWith("*")) {
      return source.startsWith(r.slice(0, -1));
    }
    return source === r;
  });
}

export function formatSignupSourcesLine(
  sources: string[],
  forms?: { slug: string; name: string; title_bg: string }[],
): string | null {
  const list = sources.filter(Boolean);
  if (list.length === 0) return null;
  return list.map((s) => labelSignupSource(s, forms)).join(" · ");
}
