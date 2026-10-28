export type ThankYouButton = {
  label: string;
  href: string;
};

function validHref(href: string): boolean {
  if (/[\s\\\u0000-\u001f\u007f]/.test(href)) return false;
  if (href.startsWith("/") && !href.startsWith("//")) return true;
  if (href.startsWith("#") && href.length > 1) return true;
  if (/^(mailto:|tel:)\S+$/i.test(href)) return true;
  try {
    const url = new URL(href);
    return (url.protocol === "https:" || url.protocol === "http:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}

/** Empty settings keep existing thank-you screens unchanged. */
export function normalizeThankYouButton(
  button?: Partial<ThankYouButton> | null,
): ThankYouButton | null {
  const label = button?.label?.trim() ?? "";
  const href = button?.href?.trim() ?? "";
  return label && validHref(href) ? { label, href } : null;
}

export function thankYouButtonError(button?: Partial<ThankYouButton> | null): string | null {
  const label = button?.label?.trim() ?? "";
  const href = button?.href?.trim() ?? "";
  if (!label && !href) return null;
  if (!label || !href) return "Попълни текст и линк за бутона или изчисти и двете полета.";
  if (!validHref(href)) return "Въведи валиден линк: https://…, /bg/…, #секция, mailto:… или tel:….";
  return null;
}
