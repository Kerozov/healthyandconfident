/** What a `{{…}}` tag can pull from the person a message goes to. */
export type TemplateVars = {
  /** Full name as stored on the subscriber (`name`). */
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  phone?: string | null;
};

/** The tags the editors offer, in the order they show them. */
export const MERGE_TAGS = [
  { tag: "{{first_name}}", label: "Първо име", sample: "Мария" },
  { tag: "{{last_name}}", label: "Фамилия", sample: "Иванова" },
  { tag: "{{name}}", label: "Цяло име", sample: "Мария Иванова" },
  { tag: "{{email}}", label: "Имейл", sample: "maria@example.com" },
  { tag: "{{phone}}", label: "Телефон", sample: "+359 888 123 456" },
] as const;

/** Sample person for previews and test sends without a real subscriber. */
export const SAMPLE_TEMPLATE_VARS: TemplateVars = {
  name: "Мария Иванова",
  firstName: "Мария",
  lastName: "Иванова",
  email: "maria@example.com",
  phone: "+359 888 123 456",
};

const PLACEHOLDER_RE =
  /\{\{\s*(name|full_name|first_name|firstname|last_name|lastname|email|phone)\s*\}\}/gi;

/** Same greeting fallback the emails always used when the name is unknown. */
const NAME_FALLBACK = "there";

/**
 * First / last name with the gaps filled from the full name: many subscribers
 * only have `name` (popup sign-ups), others only the parts (imports, forms).
 */
export function splitPersonName(vars: Pick<TemplateVars, "name" | "firstName" | "lastName">): {
  first: string;
  last: string;
  full: string;
} {
  let first = vars.firstName?.trim() ?? "";
  let last = vars.lastName?.trim() ?? "";
  const stored = vars.name?.trim().replace(/\s+/g, " ") ?? "";
  if (stored && (!first || !last)) {
    const parts = stored.split(" ");
    if (!first && !last) {
      first = parts[0] ?? "";
      last = parts.slice(1).join(" ");
    } else if (!first) {
      // "Мария Иванова" with last "Иванова" → first "Мария".
      const rest = stored.endsWith(` ${last}`) ? stored.slice(0, -last.length - 1) : parts[0];
      first = rest?.trim() ?? "";
    } else if (stored.startsWith(`${first} `)) {
      last = stored.slice(first.length + 1).trim();
    }
  }
  const full = stored || [first, last].filter(Boolean).join(" ");
  return { first, last, full };
}

export function renderEmailTemplate(template: string, vars: TemplateVars): string {
  const { first, last, full } = splitPersonName(vars);
  const email = vars.email.trim();
  const phone = vars.phone?.trim() ?? "";

  return template.replace(PLACEHOLDER_RE, (_, key: string) => {
    switch (key.toLowerCase()) {
      case "name":
      case "full_name":
        return full || NAME_FALLBACK;
      case "first_name":
      case "firstname":
        return first || NAME_FALLBACK;
      case "last_name":
      case "lastname":
        return last;
      case "email":
        return email;
      case "phone":
        return phone;
      default:
        return "";
    }
  });
}

/** Template vars from a subscriber row (any subset of its columns). */
export function templateVarsFromSubscriber(
  sub:
    | {
        name?: string | null;
        first_name?: string | null;
        last_name?: string | null;
        phone?: string | null;
      }
    | null
    | undefined,
  email: string,
): TemplateVars {
  return {
    name: sub?.name ?? null,
    firstName: sub?.first_name ?? null,
    lastName: sub?.last_name ?? null,
    phone: sub?.phone ?? null,
    email,
  };
}

/**
 * Per-recipient merge fields for the worker's campaign sends — the worker only
 * swaps exact `{{key}}` strings, so every spelling we accept gets its own key.
 */
export function campaignMergeFields(vars: TemplateVars): Record<string, string> {
  const { first, last, full } = splitPersonName(vars);
  const name = full || NAME_FALLBACK;
  const firstName = first || NAME_FALLBACK;
  return {
    name,
    full_name: name,
    first_name: firstName,
    firstname: firstName,
    last_name: last,
    lastname: last,
    email: vars.email,
    phone: vars.phone?.trim() ?? "",
  };
}
