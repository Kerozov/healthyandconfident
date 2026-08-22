import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { createFormInviteToken } from "@/lib/forms/form-invite-token";
import { publicFormInviteUrl } from "@/lib/forms/invite-url";
import type { FormTemplateRecord } from "@/lib/forms/types";
import type { EmailFooterConfig, Locale, SiteProduct } from "@/lib/supabase/types";
import {
  parseSignatureLinks,
  serializeSignatureLinks,
  signatureLinksNeedFormInvites,
  type SignatureLinkCatalog,
} from "@/lib/email/signature-links";

export type SignatureLinkRecipient = {
  email: string;
  subscriberId?: string | null;
};

async function loadSignatureCatalog(
  config: EmailFooterConfig,
): Promise<SignatureLinkCatalog> {
  const links = parseSignatureLinks(config.signature_links);
  const productIds = [
    ...new Set(
      links
        .filter((link) => link.kind === "product" && link.productId)
        .map((link) => link.productId),
    ),
  ];
  const formIds = [
    ...new Set(
      links
        .filter((link) => link.kind === "form" && link.formId)
        .map((link) => link.formId),
    ),
  ];
  if (productIds.length === 0 && formIds.length === 0) return {};

  const supabase = getAdminClient();
  const [productRes, formRes] = await Promise.all([
    productIds.length
      ? supabase.from("site_products").select("*").in("id", productIds)
      : Promise.resolve({ data: [] as SiteProduct[] }),
    formIds.length
      ? supabase.from("form_templates").select("id, slug, title_bg, title_en, name").in("id", formIds)
      : Promise.resolve({ data: [] as FormTemplateRecord[] }),
  ]);

  return {
    products: (productRes.data as SiteProduct[]) ?? [],
    forms: (formRes.data as SignatureLinkCatalog["forms"]) ?? [],
  };
}

export async function resolveSignatureCatalogHrefs(
  config: EmailFooterConfig,
): Promise<EmailFooterConfig> {
  const links = parseSignatureLinks(config.signature_links);
  if (links.length === 0) return { ...config, signature_links: [] };
  const catalog = await loadSignatureCatalog(config);
  return {
    ...config,
    signature_links: serializeSignatureLinks(links, config.locale, catalog),
  };
}

export async function withSignatureFormInvites(
  config: EmailFooterConfig,
  locale: Locale,
  recipient?: SignatureLinkRecipient | null,
): Promise<EmailFooterConfig> {
  const links = parseSignatureLinks(config.signature_links);
  const email = recipient?.email?.trim().toLowerCase() ?? "";
  if (!email || !signatureLinksNeedFormInvites(links)) {
    return { ...config, signature_links: links };
  }

  const catalog = await loadSignatureCatalog(config);
  const forms = catalog.forms ?? [];
  if (forms.length === 0) {
    return {
      ...config,
      signature_links: serializeSignatureLinks(links, locale, catalog),
    };
  }

  const supabase = getAdminClient();
  const formHrefById = new Map<string, string>();
  for (const form of forms) {
    const token = createFormInviteToken({
      f: form.id,
      e: email,
      sid: recipient?.subscriberId ?? undefined,
    });
    if (!token) continue;
    const { error } = await supabase.from("form_invitations").insert({
      form_id: form.id,
      subscriber_id: recipient?.subscriberId ?? null,
      email,
      token,
    });
    if (error) {
      console.error("[email-signature] invitation insert:", error.message);
      continue;
    }
    formHrefById.set(
      form.id.toLowerCase(),
      publicFormInviteUrl(form.slug, locale, token),
    );
  }

  return {
    ...config,
    signature_links: serializeSignatureLinks(links, locale, {
      ...catalog,
      formHrefById,
    }),
  };
}
