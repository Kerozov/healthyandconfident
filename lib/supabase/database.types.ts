import type {
  BlogPost,
  Subscriber,
  Segment,
  PopupConfig,
  EmailCampaign,
  SmsCampaign,
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
