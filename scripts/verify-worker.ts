#!/usr/bin/env bun
export {};

/**
 * Verify notification-worker auth (production or local).
 * Run: bun run verify:worker
 */
const url = (process.env.EMAIL_WORKER_URL || "").replace(/\/$/, "");
const key = process.env.EMAIL_WORKER_API_KEY?.trim();
const from = process.env.EMAIL_WORKER_FROM;

if (!url || !key) {
  console.error("Set EMAIL_WORKER_URL and EMAIL_WORKER_API_KEY in .env");
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
  console.log("Fix on Vercel (notification-worker project):");
  console.log("  SUPABASE_URL=https://gqoxwwerhgnxapcnwmgm.supabase.co");
  console.log("  SUPABASE_SERVICE_ROLE_KEY=<same as local .env.local>");
  console.log("Then Redeploy the worker.");
  console.log("Tenants are already in that DB (healthyconfident + funnelbrand).");
  process.exit(1);
}

if (res.ok || res.status === 400) {
  console.log("\n✅ Auth OK — worker recognizes your tenant API key.");
  if (!res.ok) console.log("(Non-401 response means auth passed; email send may still fail on ZeptoMail.)");
  process.exit(0);
}

console.log("\n⚠️ Unexpected status — check worker logs on Vercel.");
process.exit(1);
