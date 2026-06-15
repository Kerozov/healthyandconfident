import "server-only";

/**
 * Shared client config for notification-worker (email + SMS).
 *
 * Preferred env names:
 *   NOTIFICATION_WORKER_URL
 *   NOTIFICATION_WORKER_API_KEY   — tenant Bearer key (hc_...), same for email & SMS
 *   NOTIFICATION_WORKER_FROM        — email sender (ZeptoMail-verified domain)
 *   NOTIFICATION_WORKER_REPLY_TO    — optional email reply-to
 *   NOTIFICATION_WORKER_SMS_SENDER  — optional SMS sender id (max 14 chars)
 *
 * Legacy EMAIL_WORKER_* names are still accepted as fallbacks.
 */
export function getNotificationWorkerConfig() {
  const url = (
    process.env.NOTIFICATION_WORKER_URL ||
    process.env.EMAIL_WORKER_URL ||
    ""
  ).replace(/\/$/, "");

  const key = (
    process.env.NOTIFICATION_WORKER_API_KEY ||
    process.env.EMAIL_WORKER_API_KEY ||
    ""
  ).trim();

  const from =
    process.env.NOTIFICATION_WORKER_FROM || process.env.EMAIL_WORKER_FROM;

  const replyTo =
    process.env.NOTIFICATION_WORKER_REPLY_TO ||
    process.env.EMAIL_WORKER_REPLY_TO;

  const smsSender =
    process.env.NOTIFICATION_WORKER_SMS_SENDER ||
    process.env.SMS_NOTIFIER_SENDER;

  return { url, key, from, replyTo, smsSender };
}

export function isNotificationWorkerConfigured() {
  const { url, key } = getNotificationWorkerConfig();
  return Boolean(url && key);
}

export function requireNotificationWorkerConfig() {
  const cfg = getNotificationWorkerConfig();
  if (!cfg.url || !cfg.key) {
    throw new Error(
      "NOTIFICATION_WORKER_URL and NOTIFICATION_WORKER_API_KEY are required.",
    );
  }
  return cfg;
}
