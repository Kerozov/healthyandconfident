import { beforeEach, expect, mock, spyOn, test } from "bun:test";
import {
  normalizeNotificationEmail,
  notificationSettingsPatch,
} from "@/lib/admin/notification-preferences";

// All external effects are replaced: these checks never contact Supabase or mail anyone.
let users, queries, storedSubmissions, subscriber, subscriberInsertError, submissionInsertError;
let databaseError, workerError, invitation, form;
let ownerAuthorized, targetAdmin;
const sendEmail = mock(async () => {
  if (workerError) throw new Error("worker unavailable");
  return { jobId: "job-1", status: "sent" };
});
const runAutomations = mock(async () => ({ triggerEvents: [], rulesLoaded: 0, submitted: 0, skipped: [], errors: [] }));
const logError = spyOn(console, "error").mockImplementation(() => {});
spyOn(console, "info").mockImplementation(() => {});

function query(table) {
  const q = { table, operation: "select", filters: [], values: null };
  queries.push(q);
  const chain = {
    select() { return chain; },
    eq(key, value) { q.filters.push([key, value]); return chain; },
    not() { return chain; },
    is() { return chain; },
    retry() { return chain; },
    abortSignal() { return chain; },
    insert(values) { q.operation = "insert"; q.values = values; return chain; },
    update(values) { q.operation = "update"; q.values = values; return chain; },
    single() { q.single = true; return chain; },
    maybeSingle() { q.single = true; return chain; },
    then(resolve, reject) {
      let result = { data: null, error: null };
      if (table === "admin_users") {
        if (q.operation === "select") result = { data: q.single ? targetAdmin : users.filter((user) => q.filters.every(([key, value]) => user[key] === value)), error: databaseError ? { message: "database unavailable" } : null };
      } else if (table === "form_submissions" && q.operation === "insert") {
        if (submissionInsertError) result.error = { message: "insert failed" };
        else if (q.values.invitation_id && storedSubmissions.some((row) => row.invitation_id === q.values.invitation_id)) result.error = { code: "23505", message: "duplicate invitation" };
        else storedSubmissions.push(q.values);
      } else if (table === "subscribers") {
        result = q.operation === "insert"
          ? { data: subscriberInsertError ? null : { id: "new-subscriber" }, error: subscriberInsertError ? { message: "duplicate" } : null }
          : { data: subscriber, error: null };
      } else if (table === "form_invitations") {
        result.data = invitation;
      }
      return Promise.resolve(result).then(resolve, reject);
    },
  };
  return chain;
}

mock.module("server-only", () => ({}));
const { sendEmail: realSendEmail } = await import("@/lib/worker/email");
mock.module("@/lib/supabase/admin", () => ({ getAdminClient: () => ({ from: query }) }));
mock.module("@/lib/worker/email", () => ({ sendEmail }));
mock.module("@/lib/admin/forms-data", () => ({ getFormTemplateBySlug: async () => form, getFormTemplateById: async () => form }));
mock.module("@/lib/automation/run", () => ({ runAutomations }));
mock.module("@/lib/automation/send", () => ({ runAutomations }));
mock.module("@/lib/automation/cancel", () => ({ cancelIneligibleAutomationDeliveriesForSubscriber: async () => {} }));
mock.module("@/lib/contacts/ensure", () => ({ ensureContactForSubscriber: async () => {} }));
mock.module("@/lib/site/signup-tags", () => ({ allowedSignupTags: async () => new Set(), sanitizeSignupSource: () => "popup" }));
mock.module("@/lib/util/rate-limit", () => ({ createRateLimiter: () => () => false, requestIp: () => "127.0.0.1" }));
mock.module("@/lib/forms/form-invite-token", () => ({ verifyFormInviteToken: () => ({ f: "form-1", e: "visitor@example.com", sid: null }) }));
mock.module("@/lib/admin/auth", () => ({ requireOwner: async () => {
  if (!ownerAuthorized) throw new Error("Само главният админ има достъп.");
  return { id: "owner-1", role: "owner" };
}, requireAdmin: async () => ({ id: "owner-1", role: "owner" }) }));
mock.module("@/lib/admin/audit", () => ({ logAdminChange: () => {} }));
mock.module("@/lib/admin/passwords", () => ({ hashPassword: async () => "test-hash", verifyPassword: async () => false, safeEqualSecret: () => false }));
mock.module("next/cache", () => ({ revalidatePath: () => {} }));
const nextServer = await import("next/server");
mock.module("next/server", () => ({ ...nextServer, after: () => {} }));

const { notifyFormSubmission, notifyNewSubscriber } = await import("@/lib/admin/notifications");
const { POST: submitForm } = await import("@/app/api/forms/[slug]/submit/route");
const { POST: subscribe } = await import("@/app/api/subscribe/route");
const { createAdminProfile, updateAdminProfile } = await import("@/app/(admin)/admin/team-actions");

const submission = {
  id: "submission-1", email: "visitor@example.com", submitted_at: "2026-10-27T10:00:00Z",
  answers: { email: "visitor@example.com", message: "<img src=x onerror=alert(1)>\nВтори ред", choice: "yes", consent: false },
};
const post = (path, body) => new Request(`http://localhost${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const submit = (body = { answers: submission.answers }) => submitForm(post("/api/forms/contact/submit", body), { params: Promise.resolve({ slug: "contact" }) });

beforeEach(() => {
  users = [{ notification_email: "Staff@Example.com", role: "owner", screens: [], active: true, notify_form_submissions: true, notify_new_subscribers: true }];
  queries = []; storedSubmissions = []; subscriber = null; invitation = null;
  databaseError = false; workerError = false; submissionInsertError = false; subscriberInsertError = false;
  ownerAuthorized = true;
  targetAdmin = { id: "owner-1", role: "owner", screens: [], active: true };
  form = {
    id: "form-1", slug: "contact", name: "Запитвания", title_bg: "Свържи се с нас <script>", title_en: "Contact", enabled: true,
    settings: { tags_on_submit: [] },
    fields: [
      { id: "email", type: "email", required: true, label_bg: "Имейл" },
      { id: "message", type: "textarea", required: true, label_bg: "Съобщение" },
      { id: "choice", type: "radio", label_bg: "Избор", options: [{ value: "yes", label_bg: "Да, моля" }] },
      { id: "consent", type: "consent", label_bg: "Маркетинг" },
    ],
  };
  sendEmail.mockClear(); runAutomations.mockClear(); logError.mockClear();
});

test("settings validate email, permissions and explicit opt-in", () => {
  expect(normalizeNotificationEmail(" Staff@Example.com ")).toBe("staff@example.com");
  for (const email of ["bad", "a@b", "a@b.com\r\nBcc: other@example.com", "<a>@b.com", "x".repeat(250) + "@a.com"]) expect(normalizeNotificationEmail(email)).toBeNull();
  const owner = { role: "owner", screens: [] };
  const settings = { notificationEmail: "", notifyFormSubmissions: true, notifyNewSubscribers: false };
  expect(notificationSettingsPatch(settings, owner).error).toContain("Добави имейл");
  settings.notificationEmail = "staff@example.com";
  expect(notificationSettingsPatch(settings, { role: "member", screens: [] }).error).toContain("Форми");
  expect(notificationSettingsPatch(settings, { role: "member", screens: ["forms"] }).patch.notify_form_submissions).toBe(true);
  expect(notificationSettingsPatch({ ...settings, notifyNewSubscribers: true }, owner).patch.notify_new_subscribers).toBe(true);
  expect(notificationSettingsPatch({ ...settings, notifyFormSubmissions: "false" }, owner).patch.notify_form_submissions).toBe(false);
  expect(notificationSettingsPatch({ notificationEmail: "", notifyFormSubmissions: false, notifyNewSubscribers: false }, owner).patch.notification_email).toBeNull();
});

test("only the owner can save notification settings on any profile", async () => {
  const input = { id: "owner-1", displayName: "Главен админ", username: "admin", screens: [], active: true,
    notificationEmail: " Staff@Example.com ", notifyFormSubmissions: true, notifyNewSubscribers: false };
  ownerAuthorized = false;
  expect((await updateAdminProfile(input)).ok).toBe(false);
  expect(queries).toHaveLength(0);
  ownerAuthorized = true;
  expect((await updateAdminProfile(input)).ok).toBe(true);
  expect(queries.find((q) => q.table === "admin_users" && q.operation === "update").values).toMatchObject({
    notification_email: "staff@example.com", notify_form_submissions: true, notify_new_subscribers: false,
  });
});

test("new profile settings persist and notifications can be switched off and email cleared", async () => {
  expect((await createAdminProfile({ displayName: "Мария Иванова", username: "maria", password: "test-password", screens: ["forms"],
    notificationEmail: "maria@example.com", notifyFormSubmissions: true, notifyNewSubscribers: false })).ok).toBe(true);
  expect(queries.find((q) => q.table === "admin_users" && q.operation === "insert").values).toMatchObject({
    notification_email: "maria@example.com", notify_form_submissions: true,
  });
  expect((await updateAdminProfile({ id: "owner-1", displayName: "Главен админ", username: "admin", screens: [], active: true,
    notificationEmail: "", notifyFormSubmissions: false, notifyNewSubscribers: false })).ok).toBe(true);
  expect(queries.find((q) => q.table === "admin_users" && q.operation === "update").values).toMatchObject({
    notification_email: null, notify_form_submissions: false, notify_new_subscribers: false,
  });
});

test("only active opted-in users with screen access receive one copy per normalized address", async () => {
  const base = users[0];
  users.push(
    { ...base, role: "member", screens: ["forms"], notification_email: " staff@example.com " },
    { ...base, role: "member", screens: ["forms"], notification_email: "member@example.com" },
    { ...base, active: false, notification_email: "inactive@example.com" },
    { ...base, notify_form_submissions: false, notification_email: "optout@example.com" },
    { ...base, role: "member", screens: ["blog"], notification_email: "revoked@example.com" },
    { ...base, notification_email: "bad-address" },
  );
  await notifyFormSubmission({ form, submission });
  expect(sendEmail).toHaveBeenCalledTimes(1);
  expect(sendEmail.mock.calls[0][0].recipients).toEqual(["staff@example.com", "member@example.com"]);
});

test("email escapes submitted HTML and shows readable option labels and the admin link", async () => {
  await notifyFormSubmission({ form, submission });
  const message = sendEmail.mock.calls[0][0];
  expect(message.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  expect(message.html).not.toContain("<img src=x");
  expect(message.html).toContain("&lt;script&gt;");
  expect(message.html).toContain("Да, моля");
  expect(message.html).toContain("/admin/forms#form-form-1");
  expect(message.html).toContain("Втори ред");
  expect(message.idempotencyKey).toBe("admin-form-submission:submission-1");
  expect(message.signal).toBeInstanceOf(AbortSignal);
});

test("each event uses its own preference and subscriber notifications have stable keys", async () => {
  users[0].notify_new_subscribers = false;
  await notifyNewSubscriber({ id: "s1", email: "visitor@example.com", name: null, phone: null, source: "popup" });
  expect(sendEmail).not.toHaveBeenCalled();
  users[0].notify_new_subscribers = true;
  await notifyNewSubscriber({ id: "s1", email: "visitor@example.com", name: "Мария", phone: null, source: "popup" });
  expect(sendEmail.mock.calls[0][0].idempotencyKey).toBe("admin-new-subscriber:s1");
  expect(sendEmail.mock.calls[0][0].html).toContain("Мария");
});

test("empty recipients and failed recipient lookup skip sending", async () => {
  users = [];
  await notifyFormSubmission({ form, submission });
  expect(sendEmail).not.toHaveBeenCalled();
  databaseError = true;
  await notifyFormSubmission({ form, submission });
  expect(sendEmail).not.toHaveBeenCalled();
  expect(logError).toHaveBeenCalledTimes(1);
});

test("a formatting failure is contained just like a delivery failure", async () => {
  await notifyFormSubmission({ form, submission: { ...submission, submitted_at: "invalid-date" } });
  expect(sendEmail).not.toHaveBeenCalled();
  expect(logError).toHaveBeenCalledTimes(1);
});

test("saved form notifies without marketing consent; mail failure still returns success", async () => {
  workerError = true;
  const response = await submit();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true });
  expect(storedSubmissions).toHaveLength(1);
  expect(sendEmail).toHaveBeenCalledTimes(1);
  expect(sendEmail.mock.calls[0][0].idempotencyKey).toBe(`admin-form-submission:${storedSubmissions[0].id}`);
  expect(runAutomations).not.toHaveBeenCalled();
  expect(logError).toHaveBeenCalledTimes(1);
});

test("invalid, unsaved and already completed forms never notify", async () => {
  expect((await submit({ answers: { email: "visitor@example.com" } })).status).toBe(400);
  expect(sendEmail).not.toHaveBeenCalled();
  submissionInsertError = true;
  expect((await submit()).status).toBe(500);
  expect(sendEmail).not.toHaveBeenCalled();
  submissionInsertError = false;
  invitation = { id: "invite-1", completed_at: "2026-10-27T09:00:00Z" };
  expect((await submit({ token: "valid", answers: submission.answers })).status).toBe(409);
  expect(sendEmail).not.toHaveBeenCalled();
  expect(storedSubmissions).toHaveLength(0);
});

test("concurrent replies to one invitation produce one submission and one alert", async () => {
  invitation = { id: "invite-1", completed_at: null };
  const replies = await Promise.all([
    submit({ token: "valid", answers: submission.answers }),
    submit({ token: "valid", answers: submission.answers }),
  ]);
  expect(replies.map((response) => response.status).sort()).toEqual([200, 409]);
  expect(storedSubmissions).toHaveLength(1);
  expect(storedSubmissions[0].invitation_id).toBe("invite-1");
  expect(sendEmail).toHaveBeenCalledTimes(1);
});

test("notification deadline aborts a stalled worker instead of hanging the form", async () => {
  const savedFetch = globalThis.fetch;
  const savedUrl = process.env.NOTIFICATION_WORKER_URL;
  const savedKey = process.env.NOTIFICATION_WORKER_API_KEY;
  process.env.NOTIFICATION_WORKER_URL = "https://worker.test";
  process.env.NOTIFICATION_WORKER_API_KEY = "test-key";
  const signal = AbortSignal.timeout(20);
  const fetchStub = mock(async (_url, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true });
  }));
  globalThis.fetch = fetchStub;
  try {
    await expect(realSendEmail({ subject: "Test", html: "<p>Test</p>", recipients: ["staff@example.com"], idempotencyKey: "deadline-test", signal })).rejects.toThrow();
    expect(signal.aborted).toBe(true);
    expect(fetchStub).toHaveBeenCalledTimes(1);
  } finally {
    globalThis.fetch = savedFetch;
    if (savedUrl === undefined) delete process.env.NOTIFICATION_WORKER_URL; else process.env.NOTIFICATION_WORKER_URL = savedUrl;
    if (savedKey === undefined) delete process.env.NOTIFICATION_WORKER_API_KEY; else process.env.NOTIFICATION_WORKER_API_KEY = savedKey;
  }
});

test("transient worker failure retries with the same idempotency key and deadline", async () => {
  const savedFetch = globalThis.fetch;
  const savedUrl = process.env.NOTIFICATION_WORKER_URL;
  const savedKey = process.env.NOTIFICATION_WORKER_API_KEY;
  process.env.NOTIFICATION_WORKER_URL = "https://worker.test";
  process.env.NOTIFICATION_WORKER_API_KEY = "test-key";
  const signal = AbortSignal.timeout(1000);
  const fetchStub = mock(async () => fetchStub.mock.calls.length === 1
    ? Response.json({ error: "retry" }, { status: 503 })
    : Response.json({ jobId: "retried-job", status: "pending" }));
  globalThis.fetch = fetchStub;
  try {
    const result = await realSendEmail({ subject: "Test", html: "<p>Test</p>", recipients: ["staff@example.com"], idempotencyKey: "retry-test", signal });
    expect(result.jobId).toBe("retried-job");
    expect(fetchStub).toHaveBeenCalledTimes(2);
    for (const [, init] of fetchStub.mock.calls) {
      expect(init.signal).toBe(signal);
      expect(JSON.parse(init.body).idempotencyKey).toBe("retry-test");
    }
  } finally {
    globalThis.fetch = savedFetch;
    if (savedUrl === undefined) delete process.env.NOTIFICATION_WORKER_URL; else process.env.NOTIFICATION_WORKER_URL = savedUrl;
    if (savedKey === undefined) delete process.env.NOTIFICATION_WORKER_API_KEY; else process.env.NOTIFICATION_WORKER_API_KEY = savedKey;
  }
});

test("first subscription notifies, repeat subscriptions and failed inserts do not", async () => {
  const body = { email: "visitor@example.com", name: "Мария", consent: true };
  expect((await subscribe(post("/api/subscribe", body))).status).toBe(200);
  expect(sendEmail).toHaveBeenCalledTimes(1);
  expect(sendEmail.mock.calls[0][0].idempotencyKey).toBe("admin-new-subscriber:new-subscriber");
  sendEmail.mockClear();
  subscriber = { id: "existing", tags: [] };
  expect((await subscribe(post("/api/subscribe", body))).status).toBe(200);
  expect(sendEmail).not.toHaveBeenCalled();
  subscriber = null; subscriberInsertError = true;
  expect((await subscribe(post("/api/subscribe", body))).status).toBe(500);
  expect(sendEmail).not.toHaveBeenCalled();
});
