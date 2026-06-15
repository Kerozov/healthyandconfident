import "server-only";

/**
 * Notification-worker client config (email + SMS share URL + API key).
 * SMS sender + Notifier key are on the worker tenant — see notification-worker seed.
 */
export function getNotificationWorkerConfig() {
  const url = (process.env.NOTIFICATION_WORKER_URL || "").replace(/\/$/, "");
  const key = (process.env.NOTIFICATION_WORKER_API_KEY || "").trim();
  const from = process.env.NOTIFICATION_WORKER_FROM;
  const replyTo = process.env.NOTIFICATION_WORKER_REPLY_TO;
  return { url, key, from, replyTo };
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
