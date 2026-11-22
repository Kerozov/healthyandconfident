import "server-only";

import type { McpSource } from "@/lib/mcp/catalog";

type AnyModule = Record<string, unknown>;

/**
 * Модулите зад каталога. Зареждат се чак при нужда, за да не тегли всяко
 * извикване целия админ. Пътищата съвпадат с `MCP_SOURCES`.
 */
export const MCP_MODULES: Record<McpSource, () => Promise<AnyModule>> = {
  actions: () => import("@/app/(admin)/admin/actions"),
  blackFridayActions: () => import("@/app/(admin)/admin/black-friday-actions"),
  contactActions: () => import("@/app/(admin)/admin/contact-actions"),
  integrationActions: () => import("@/app/(admin)/admin/integration-actions"),
  questionnaireActions: () => import("@/app/(admin)/admin/questionnaire-actions"),
  teamActions: () => import("@/app/(admin)/admin/team-actions"),
  academyActions: () => import("@/app/(admin)/admin/academy-actions"),
  data: () => import("@/lib/admin/data"),
  automationsData: () => import("@/lib/admin/automations-data"),
  contactsData: () => import("@/lib/admin/contacts-data"),
  formsData: () => import("@/lib/admin/forms-data"),
  dashboard: () => import("@/lib/admin/dashboard-overview"),
  emailStats: () => import("@/lib/admin/email-stats"),
  paymentStats: () => import("@/lib/admin/payment-stats"),
  visitStats: () => import("@/lib/admin/visit-stats"),
  zoomStats: () => import("@/lib/admin/zoom-stats"),
  team: () => import("@/lib/admin/team"),
  audit: () => import("@/lib/admin/audit"),
  contactStatuses: () => import("@/lib/admin/contact-statuses"),
  personProfile: () => import("@/lib/admin/person-profile"),
  emailHistory: () => import("@/lib/admin/email-history"),
  engagement: () => import("@/lib/admin/engagement"),
  personFacts: () => import("@/lib/admin/person-facts"),
  questionnaireReport: () => import("@/lib/admin/questionnaire-report"),
  freeMenu: () => import("@/lib/admin/free-menu"),
  metaData: () => import("@/lib/admin/meta-data"),
  blackFriday: () => import("@/lib/black-friday/admin"),
  siteContent: () => import("@/lib/site/content"),
  contactConfig: () => import("@/lib/site/contact-config"),
  questionnaireCta: () => import("@/lib/site/questionnaire-cta-data"),
  zoomLive: () => import("@/lib/zoom/live"),
  funnelBrand: () => import("@/lib/integrations/funnel-brand-sync"),
  emailBlocks: () => import("@/lib/email/blocks"),
};
