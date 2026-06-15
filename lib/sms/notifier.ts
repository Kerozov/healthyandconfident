import "server-only";

/**
 * SMS notifier adapter — wired the same way as the email worker:
 * send an API key + a message, the notifier service handles delivery.
 *
 * Env (fill in when the notifier is ready):
 *   SMS_NOTIFIER_URL       e.g. https://notifier.example.com
 *   SMS_NOTIFIER_API_KEY   Bearer key
 *   SMS_NOTIFIER_SENDER    optional sender id / name
 *
 * Until configured, sendSms() returns a clear "not configured" result so the
 * admin UI keeps working without throwing.
 */

type SendSmsArgs = {
  message: string;
  recipients: string[]; // phone numbers in E.164 (+359..., +44...)
};

export type SmsSendResult = {
  ok: boolean;
  sent: number;
  failed: number;
  providerRef?: string;
  error?: string;
};

export function isSmsConfigured() {
  return Boolean(process.env.SMS_NOTIFIER_URL && process.env.SMS_NOTIFIER_API_KEY);
}

export async function sendSms(args: SendSmsArgs): Promise<SmsSendResult> {
  const url = process.env.SMS_NOTIFIER_URL;
  const key = process.env.SMS_NOTIFIER_API_KEY;
  const sender = process.env.SMS_NOTIFIER_SENDER;

  if (!url || !key) {
    return {
      ok: false,
      sent: 0,
      failed: args.recipients.length,
      error: "SMS notifier is not configured yet (set SMS_NOTIFIER_URL & SMS_NOTIFIER_API_KEY).",
    };
  }

  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/api/v1/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: args.message,
        recipients: args.recipients,
        ...(sender ? { sender } : {}),
      }),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as {
      sent?: number;
      failed?: number;
      ref?: string;
      error?: string;
    };
    if (!res.ok) {
      return {
        ok: false,
        sent: 0,
        failed: args.recipients.length,
        error: data.error || `Notifier failed (${res.status})`,
      };
    }
    return {
      ok: true,
      sent: data.sent ?? args.recipients.length,
      failed: data.failed ?? 0,
      providerRef: data.ref,
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
