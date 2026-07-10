/** Sequence keys for contact_worker_jobs — orchestration lives in this app. */
export const SEQUENCE_PRE_PAYMENT_REMINDERS = "pre-payment-reminders";
export const SEQUENCE_POST_PURCHASE_ONBOARDING = "post-purchase-onboarding";

export type ContactPaymentStatus = "unpaid" | "paid";

export type ContactWorkerJobStatus = "pending" | "canceled" | "sent" | "failed";

export type ContactEventType =
  | "link_click"
  | "page_view"
  | "checkout_started"
  | "payment_completed"
  | "zoom_joined"
  | "zoom_left"
  | "reminders_canceled";

export type Contact = {
  id: string;
  email: string;
  name: string | null;
  payment_status: ContactPaymentStatus;
  paid_at: string | null;
  last_stripe_session_id: string | null;
  zoom_attended: boolean;
  zoom_last_joined_at: string | null;
  zoom_last_left_at: string | null;
  zoom_total_minutes: number;
  created_at: string;
  updated_at: string;
};

export type ContactWorkerJob = {
  id: string;
  contact_id: string;
  worker_job_id: string;
  sequence_key: string;
  idempotency_key: string | null;
  status: ContactWorkerJobStatus;
  scheduled_at: string | null;
  canceled_at: string | null;
  created_at: string;
};

export type ContactEvent = {
  id: string;
  contact_id: string;
  event_type: ContactEventType;
  source: string | null;
  campaign_id: string | null;
  worker_job_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type ContactListRow = Contact & {
  pending_reminder_count: number;
};
