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
  first_name: string | null;
  last_name: string | null;
  facebook_url: string | null;
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

export type SegmentGroup = {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  created_at: string;
};

export type Segment = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  group_id: string | null;
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

export type EmailFooterConfig = {
  id: string;
  locale: Locale;
  signature_enabled: boolean;
  signature_image_url: string | null;
  signature_closing: string;
  signature_name: string;
  signature_title: string;
  signature_email: string;
  signature_phone: string;
  brand_name: string;
  brand_color: string;
  website_url: string;
  footer_email: string;
  footer_phone: string;
  address_line1: string;
  address_line2: string;
  facebook_url: string | null;
  youtube_url: string | null;
  disclaimer: string;
  preferences_url: string | null;
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
  /** Target everyone in these groups (includes nested subgroups). */
  group_ids: string[];
  /** any = OR between rules, all = AND (every group/segment required). */
  audience_logic: "any" | "all";
  exclude_group_ids: string[];
  exclude_segment_keys: string[];
  /** When trigger is purchase — only fire if buyer purchased one of these products (empty = any). */
  purchase_product_ids: string[];
  new_subscribers_only: boolean;
  after_automation_id: string | null;
  delay_days: number;
  /** Local send time (Europe/Sofia) on the target day, HH:MM */
  send_time: string;
  /** Optional fixed calendar date — overrides delay_days when set */
  send_date: string | null;
  subject_bg: string;
  html_bg: string;
  subject_en: string;
  html_en: string;
  cta_label_bg: string;
  cta_url_bg: string;
  cta_label_en: string;
  cta_url_en: string;
  attachment_path_bg: string | null;
  attachment_filename_bg: string | null;
  attachment_path_en: string | null;
  attachment_filename_en: string | null;
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
  click_count: number;
  first_clicked_at: string | null;
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
  clicked_count: number;
  unique_clickers_count: number;
  total_clicks: number;
  last_synced_at: string | null;
};

export type CampaignDelivery = {
  id: string;
  campaign_id: string;
  subscriber_id: string | null;
  email: string;
  worker_job_id: string | null;
  status: "scheduled" | "sent" | "failed" | "canceled";
  recipient_status: string | null;
  opened_at: string | null;
  delivered_at: string | null;
  click_count: number;
  first_clicked_at: string | null;
  sent_at: string;
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
  cta_label: string;
  cta_url: string;
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
  clicked_count: number;
  last_synced_at: string | null;
  parent_campaign_id: string | null;
  target_tags: string[] | null;
  attachment_path: string | null;
  attachment_filename: string | null;
};

export type AudienceMode = "segment" | "tags";

export type AudienceInput = {
  mode: AudienceMode;
  /** @deprecated Use segment_keys */
  segment_key?: string;
  /** One or more segments (OR) — subscriber must match at least one. */
  segment_keys?: string[];
  /** Groups (OR) — expands to all segments in each group and nested subgroups. */
  group_ids?: string[];
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

export type SiteSectionKey = "events" | "products" | "videos" | "guides";

export type SiteSection = {
  key: SiteSectionKey;
  enabled: boolean;
  title_bg: string;
  title_en: string;
  updated_at: string;
};

export type SiteEvent = {
  id: string;
  title_bg: string;
  title_en: string;
  description_bg: string;
  description_en: string;
  url: string;
  image_url: string | null;
  event_date: string | null;
  offer_id: string | null;
  offer_headline_bg: string;
  offer_headline_en: string;
  offer_enabled: boolean;
  enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type SiteVideo = {
  id: string;
  title_bg: string;
  title_en: string;
  youtube_url: string;
  enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type OfferType = "upsell" | "downsell";

export type SiteProduct = {
  id: string;
  title_bg: string;
  title_en: string;
  description_bg: string;
  description_en: string;
  stripe_url: string;
  stripe_price_id: string;
  price_label_bg: string;
  price_label_en: string;
  image_url: string | null;
  offer_type: OfferType;
  headline_bg: string;
  headline_en: string;
  cta_label_bg: string;
  cta_label_en: string;
  audience_tags: string[];
  /** Tags applied to subscriber when this product is purchased */
  purchase_tags: string[];
  enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type SiteGuide = {
  id: string;
  title_bg: string;
  title_en: string;
  description_bg: string;
  description_en: string;
  stripe_url: string;
  stripe_price_id: string;
  price_label_bg: string;
  price_label_en: string;
  image_url: string | null;
  enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type SiteCtaPlacement = {
  key: string;
  label_bg: string;
  label_en: string;
  offer_id: string | null;
  offer_headline_bg: string;
  offer_headline_en: string;
  offer_enabled: boolean;
  updated_at: string;
};
