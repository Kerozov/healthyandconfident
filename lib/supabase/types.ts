export type Locale = "bg" | "en";

export type BlogPost = {
  id: string;
  locale: Locale;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover_image: string | null;
  author: string;
  tags: string[];
  seo_title: string | null;
  seo_description: string | null;
  reading_minutes: number;
  status: "draft" | "published";
  featured: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Subscriber = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  locale: Locale;
  source: string;
  status: "subscribed" | "unsubscribed";
  tags: string[];
  consent: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Segment = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type PopupConfig = {
  id: string;
  locale: Locale;
  enabled: boolean;
  title: string;
  message: string;
  cta_label: string;
  success_message: string;
  image_url: string | null;
  segment_tag: string;
  delay_seconds: number;
  updated_at: string;
};

export type AutomationTrigger = "registration" | "purchase" | "new_subscriber";

export type AutomationChannel = "email" | "sms";

/** @deprecated Legacy table — use Automation */
export type AutomatedEmail = {
  id: string;
  trigger: "registration" | "purchase";
  locale: Locale;
  enabled: boolean;
  subject: string;
  html: string;
  updated_at: string;
};

export type Automation = {
  id: string;
  name: string;
  channel: AutomationChannel;
  trigger_event: AutomationTrigger;
  enabled: boolean;
  segment_keys: string[];
  new_subscribers_only: boolean;
  after_automation_id: string | null;
  delay_days: number;
  subject_bg: string;
  html_bg: string;
  subject_en: string;
  html_en: string;
  sms_bg: string;
  sms_en: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type AutomationDelivery = {
  id: string;
  automation_id: string;
  subscriber_id: string | null;
  email: string;
  phone: string | null;
  channel: AutomationChannel;
  status: "scheduled" | "sent" | "failed" | "skipped" | "canceled";
  worker_job_id: string | null;
  error: string | null;
  scheduled_for: string | null;
  sent_at: string;
  recipient_status: string | null;
  opened_at: string | null;
  delivered_at: string | null;
  last_synced_at: string | null;
};

export type AutomationStats = {
  sent_count: number;
  scheduled_count: number;
  failed_count: number;
  opened_count: number;
  delivered_count: number;
  bounced_count: number;
  not_opened_count: number;
  last_synced_at: string | null;
};

export type CampaignStatus =
  | "draft"
  | "queued"
  | "sending"
  | "sent"
  | "scheduled"
  | "failed"
  | "partial"
  | "canceled";

export type EmailCampaign = {
  id: string;
  subject: string;
  html: string;
  locale: Locale | null;
  segment_tag: string;
  recipients_count: number;
  worker_job_id: string | null;
  status: CampaignStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  error: string | null;
  created_at: string;
  // tracking (synced from the worker)
  sent_count: number;
  failed_count: number;
  opened_count: number;
  machine_opened_count: number;
  delivered_count: number;
  not_opened_count: number;
  bounced_count: number;
  total_count: number;
  last_synced_at: string | null;
  parent_campaign_id: string | null;
  target_tags: string[] | null;
};

export type AudienceMode = "segment" | "tags";

export type AudienceInput = {
  mode: AudienceMode;
  segment_key?: string;
  tags?: string[];
  locale?: "bg" | "en" | "";
};

export type SmsCampaignStatus =
  | "draft"
  | "queued"
  | "scheduled"
  | "sending"
  | "sent"
  | "failed"
  | "partial"
  | "canceled";

export type SmsCampaign = {
  id: string;
  message: string;
  segment_tag: string;
  recipients_count: number;
  /** Worker job id — source of truth for delivery status */
  provider_ref: string | null;
  status: SmsCampaignStatus;
  sent_count: number;
  failed_count: number;
  scheduled_at: string | null;
  sent_at: string | null;
  error: string | null;
  created_at: string;
};
