#!/usr/bin/env bun
export {};

/**
 * Verify notification-worker tenant auth (email endpoint).
 * Run: bun run verify:worker
 */
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

if (!url || !key) {
  console.error(
    "Set NOTIFICATION_WORKER_URL and NOTIFICATION_WORKER_API_KEY in .env",
  );
  process.exit(1);
}

console.log("Worker URL:", url);
console.log("API key:", key.slice(0, 6) + "..." + key.slice(-4));

const res = await fetch(`${url}/api/v1/send`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    subject: "auth-check",
    html: "<p>auth check</p>",
    recipients: ["auth-check@example.com"],
    from,
  }),
});

const body = await res.json().catch(() => ({}));
console.log("Status:", res.status);
console.log("Response:", JSON.stringify(body, null, 2));

if (res.status === 401) {
  console.log("\n❌ Unauthorized — worker does not recognize this API key.");
  console.log("Fix: ensure TENANT_HEALTHYCONFIDENT_KEY in notification-worker");
  console.log("matches NOTIFICATION_WORKER_API_KEY here, then bun run seed + redeploy.");
  process.exit(1);
}

if (res.ok || res.status === 400) {
  console.log("\n✅ Auth OK — worker recognizes your tenant API key.");
  if (!res.ok) {
    console.log("(Non-401 = auth passed; ZeptoMail/from may still need tuning.)");
  }
  process.exit(0);
}

console.log("\n⚠️ Unexpected status — check worker logs on Vercel.");
process.exit(1);
