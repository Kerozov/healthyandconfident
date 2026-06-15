import "server-only";

import {
  getNotificationWorkerConfig,
  isNotificationWorkerConfigured,
} from "@/lib/worker/config";

/**
 * SMS via notification-worker → Notifier.bg (tenant NOTIFIER_KEY lives in worker DB).
 * Same NOTIFICATION_WORKER_API_KEY as email.
 */

type SendSmsArgs = {
  message: string;
  recipients: string[]; // E.164: +359..., +44...
};

export type SmsSendResult = {
  ok: boolean;
  sent: number;
  failed: number;
  providerRef?: string;
  error?: string;
};

export function isSmsConfigured() {
  return isNotificationWorkerConfigured();
}

export async function sendSms(args: SendSmsArgs): Promise<SmsSendResult> {
  const { url, key, smsSender } = getNotificationWorkerConfig();

  if (!url || !key) {
    return {
      ok: false,
      sent: 0,
      failed: args.recipients.length,
      error:
        "Notification worker is not configured (set NOTIFICATION_WORKER_URL & NOTIFICATION_WORKER_API_KEY).",
    };
  }

  try {
    const res = await fetch(`${url}/api/v1/sms/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body: args.message,
        recipients: args.recipients,
        ...(smsSender ? { sender: smsSender } : {}),
      }),
      cache: "no-store",
    });

    const data = (await res.json().catch(() => ({}))) as {
      jobId?: string;
      sent?: number;
      failed?: number;
      error?: string;
      errors?: string[];
    };

    if (!res.ok) {
      return {
        ok: false,
        sent: 0,
        failed: args.recipients.length,
        error:
          data.error ||
          data.errors?.join("; ") ||
          `SMS failed (${res.status})`,
      };
    }

    return {
      ok: true,
      sent: data.sent ?? args.recipients.length,
      failed: data.failed ?? 0,
      providerRef: data.jobId,
    };
  } catch (err) {
    return {
      ok: false,
      sent: 0,
      failed: args.recipients.length,
      error: err instanceof Error ? err.message : "SMS request failed",
    };
  }
}
