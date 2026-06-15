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

export type EmailCampaign = {
  id: string;
  subject: string;
  html: string;
  locale: Locale | null;
  segment_tag: string;
  recipients_count: number;
  worker_job_id: string | null;
  status: "draft" | "sending" | "sent" | "scheduled" | "failed";
  scheduled_at: string | null;
  sent_at: string | null;
  error: string | null;
  created_at: string;
};

export type SmsCampaign = {
  id: string;
  message: string;
  segment_tag: string;
  recipients_count: number;
  provider_ref: string | null;
  status: "draft" | "sending" | "sent" | "failed";
  sent_at: string | null;
  error: string | null;
  created_at: string;
};
