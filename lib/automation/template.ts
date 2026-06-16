const PLACEHOLDER_RE = /\{\{\s*(name|email)\s*\}\}/gi;

export function renderEmailTemplate(
  template: string,
  vars: { name?: string | null; email: string },
): string {
  const name = vars.name?.trim() || "there";
  const email = vars.email.trim();

  return template.replace(PLACEHOLDER_RE, (_, key: string) => {
    const k = key.toLowerCase();
    if (k === "name") return name;
    if (k === "email") return email;
    return "";
  });
}
