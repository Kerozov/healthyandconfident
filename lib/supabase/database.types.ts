import type {
  BlogPost,
  Subscriber,
  Segment,
  PopupConfig,
  EmailCampaign,
  SmsCampaign,
  AutomatedEmail,
  Automation,
  AutomationDelivery,
  SiteSection,
  SiteEvent,
  SiteProduct,
  SiteVideo,
  SiteCtaPlacement,
} from "@/lib/supabase/types";

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
      popup_config: TableShape<PopupConfig>;
      email_campaigns: TableShape<EmailCampaign>;
      sms_campaigns: TableShape<SmsCampaign>;
      automated_emails: TableShape<AutomatedEmail>;
      automations: TableShape<Automation>;
      automation_deliveries: TableShape<AutomationDelivery>;
      site_sections: TableShape<SiteSection>;
      site_events: TableShape<SiteEvent>;
      site_products: TableShape<SiteProduct>;
      site_videos: TableShape<SiteVideo>;
      site_cta_placements: TableShape<SiteCtaPlacement>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
