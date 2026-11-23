import type {
  BlogPost,
  Subscriber,
  Segment,
  SegmentGroup,
  PopupConfig,
  EmailFooterConfig,
  EmailCampaign,
  SmsCampaign,
  AutomatedEmail,
  Automation,
  AutomationDelivery,
  DeliveryIssueIgnore,
  CampaignDelivery,
  SiteSection,
  SiteEvent,
  SiteProduct,
  SiteGuide,
  SiteProgramCard,
  SiteVideo,
  SiteCtaPlacement,
  SiteContactConfig,
  SiteVisit,
  AdminUser,
  AdminAuditLog,
  ZoomLiveConfig,
  ZoomWebhookLog,
  ZoomSessionEvent,
  IntegrationSyncState,
  ContactStatus,
  SubscriberHistoryEntry,
  SiteQuestionnaireCta,
  SiteBlackFridayConfig,
  BlackFridayDiscount,
  BlackFridayBundle,
} from "@/lib/supabase/types";
import type { FormTemplateRecord, FormSubmissionRecord } from "@/lib/forms/types";
import type { Contact, ContactWorkerJob, ContactEvent } from "@/lib/contacts/types";
import type { MetaPixelConfig, MetaEventLogRow } from "@/lib/meta/types";

type FormInvitation = {
  id: string;
  form_id: string;
  subscriber_id: string | null;
  email: string;
  token: string;
  sent_at: string;
  completed_at: string | null;
};

type FormTemplateSlug = {
  slug: string;
  form_id: string;
  created_at: string;
};

/** Migration 091 — answers from Launchify (and other outside sources), per person. */
type SubscriberFact = {
  id: string;
  subscriber_id: string;
  source: string;
  source_label: string;
  label: string;
  value: string;
  updated_at: string;
};

type EmailLinkClick = {
  id: string;
  source_type: "campaign" | "automation";
  source_id: string;
  email: string;
  subscriber_id: string | null;
  target_url: string | null;
  link_label: string | null;
  clicked_at: string;
};

type SubscriberPurchase = {
  id: string;
  subscriber_id: string | null;
  email: string;
  product_id: string | null;
  stripe_session_id: string | null;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  payment_status: "paid" | "refunded" | "failed";
  /** Amount of this line only. */
  amount_cents: number | null;
  /** Stripe session total, repeated on every line of the order. */
  order_total_cents: number | null;
  currency: string | null;
  purchased_at: string;
  /** Academy product this line unlocks (`*` = every program) — migration 085. */
  academy_product: string | null;
  /** Course code the academy issued for this line. */
  academy_code: string | null;
};

/** Migration 098 — the Claude connector (MCP). Only hashes are stored. */
type McpClient = {
  id: string;
  name: string;
  redirect_uris: string[];
  created_at: string;
};

type McpEmailChallenge = {
  id: string;
  code_hash: string;
  client_id: string;
  email: string;
  attempts: number;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

type McpAuthCode = {
  code_hash: string;
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  email: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

type McpToken = {
  id: string;
  client_id: string;
  email: string;
  access_hash: string;
  refresh_hash: string;
  access_expires_at: string;
  refresh_expires_at: string;
  revoked_at: string | null;
  last_used_at: string | null;
  created_at: string;
};

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type TableShape<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      blog_posts: TableShape<BlogPost>;
      subscribers: TableShape<Subscriber>;
      segments: TableShape<Segment>;
      segment_groups: TableShape<SegmentGroup>;
      popup_config: TableShape<PopupConfig>;
      email_footer_config: TableShape<EmailFooterConfig>;
      email_campaigns: TableShape<EmailCampaign>;
      campaign_deliveries: TableShape<CampaignDelivery>;
      email_link_clicks: TableShape<EmailLinkClick>;
      sms_campaigns: TableShape<SmsCampaign>;
      automated_emails: TableShape<AutomatedEmail>;
      automations: TableShape<Automation>;
      automation_deliveries: TableShape<AutomationDelivery>;
      delivery_issue_ignores: TableShape<DeliveryIssueIgnore>;
      form_templates: TableShape<FormTemplateRecord>;
      form_submissions: TableShape<FormSubmissionRecord>;
      form_invitations: TableShape<FormInvitation>;
      form_template_slugs: TableShape<FormTemplateSlug>;
      site_sections: TableShape<SiteSection>;
      site_events: TableShape<SiteEvent>;
      site_products: TableShape<SiteProduct>;
      site_guides: TableShape<SiteGuide>;
      site_program_cards: TableShape<SiteProgramCard>;
      subscriber_purchases: TableShape<SubscriberPurchase>;
      contacts: TableShape<Contact>;
      contact_worker_jobs: TableShape<ContactWorkerJob>;
      contact_events: TableShape<ContactEvent>;
      site_videos: TableShape<SiteVideo>;
      site_cta_placements: TableShape<SiteCtaPlacement>;
      site_contact_config: TableShape<SiteContactConfig>;
      zoom_live_config: TableShape<ZoomLiveConfig>;
      zoom_webhook_log: TableShape<ZoomWebhookLog>;
      zoom_session_events: TableShape<ZoomSessionEvent>;
      meta_pixel_config: TableShape<MetaPixelConfig>;
      meta_event_log: TableShape<MetaEventLogRow>;
      integration_sync_state: TableShape<IntegrationSyncState>;
      site_visits: TableShape<SiteVisit>;
      admin_users: TableShape<AdminUser>;
      admin_audit_log: TableShape<AdminAuditLog>;
      /** Migration 088 — statuses the main admin defines, and each person's history. */
      contact_statuses: TableShape<ContactStatus>;
      subscriber_history: TableShape<SubscriberHistoryEntry>;
      site_questionnaire_cta: TableShape<SiteQuestionnaireCta>;
      subscriber_facts: TableShape<SubscriberFact>;
      /** Migration 092 — Black Friday campaign settings. */
      site_black_friday: TableShape<SiteBlackFridayConfig>;
      /** Migration 096 — Black Friday discounts and bundles from the catalog. */
      black_friday_discounts: TableShape<BlackFridayDiscount>;
      black_friday_bundles: TableShape<BlackFridayBundle>;
      /** Migration 098 — the Claude connector (MCP). */
      mcp_clients: TableShape<McpClient>;
      mcp_email_challenges: TableShape<McpEmailChallenge>;
      mcp_auth_codes: TableShape<McpAuthCode>;
      mcp_tokens: TableShape<McpToken>;
    };
    Views: Record<string, never>;
    Functions: {
      /** Migration 060 — the whole admin dashboard aggregated in one call. */
      admin_dashboard_overview: {
        Args: { p_days: number };
        Returns: Json;
      };
      /** Migration 061 — SUM(click_count) for one campaign, without paging. */
      campaign_click_total: {
        Args: { p_campaign_id: string };
        Returns: number;
      };
      /** Migration 099 — move a person to a new email across every table. */
      change_subscriber_email: {
        Args: { p_subscriber_id: string; p_new_email: string };
        Returns: Json;
      };
      /** Migration 075 — distinct tags of subscribed subscribers, in one call. */
      subscriber_tags: {
        Args: Record<string, never>;
        Returns: string[];
      };
      /** Migration 093 — emails the site sent per Sofia day, for the Launchify allowance. */
      launchify_email_usage_by_day: {
        Args: { p_from: string };
        Returns: { day: string; emails: number }[];
      };
      /** Migration 080 — subscribed people who got mail but opened nothing since `p_since`. */
      inactive_subscribers: {
        Args: { p_since: string };
        Returns: {
          id: string;
          email: string;
          name: string | null;
          locale: string | null;
          tags: string[] | null;
          created_at: string;
          sent_count: number;
          last_sent_at: string | null;
          last_opened_at: string | null;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
