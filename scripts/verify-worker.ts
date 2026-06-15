#!/usr/bin/env bun
export {};

/** Verify notification-worker tenant auth. Run: bun run verify:worker */
const url = (process.env.NOTIFICATION_WORKER_URL || "").replace(/\/$/, "");
const key = (process.env.NOTIFICATION_WORKER_API_KEY || "").trim();
const from = process.env.NOTIFICATION_WORKER_FROM;

if (!url || !key) {
  console.error("Set NOTIFICATION_WORKER_URL and NOTIFICATION_WORKER_API_KEY in .env");
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
  console.log("\n❌ Unauthorized — check TENANT_*_KEY in notification-worker matches .env");
  process.exit(1);
}

if (res.ok || res.status === 400) {
  console.log("\n✅ Auth OK");
  process.exit(0);
}

console.log("\n⚠️ Unexpected status — check worker logs.");
process.exit(1);
