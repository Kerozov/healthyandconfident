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
  CampaignDelivery,
  SiteSection,
  SiteEvent,
  SiteProduct,
  SiteGuide,
  SiteVideo,
  SiteCtaPlacement,
} from "@/lib/supabase/types";
import type { FormTemplateRecord, FormSubmissionRecord } from "@/lib/forms/types";
import type { Contact, ContactWorkerJob, ContactEvent } from "@/lib/contacts/types";

type FormInvitation = {
  id: string;
  form_id: string;
  subscriber_id: string | null;
  email: string;
  token: string;
  sent_at: string;
  completed_at: string | null;
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
  purchased_at: string;
};

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
      form_templates: TableShape<FormTemplateRecord>;
      form_submissions: TableShape<FormSubmissionRecord>;
      form_invitations: TableShape<FormInvitation>;
      site_sections: TableShape<SiteSection>;
      site_events: TableShape<SiteEvent>;
      site_products: TableShape<SiteProduct>;
      site_guides: TableShape<SiteGuide>;
      subscriber_purchases: TableShape<SubscriberPurchase>;
      contacts: TableShape<Contact>;
      contact_worker_jobs: TableShape<ContactWorkerJob>;
      contact_events: TableShape<ContactEvent>;
      site_videos: TableShape<SiteVideo>;
      site_cta_placements: TableShape<SiteCtaPlacement>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
