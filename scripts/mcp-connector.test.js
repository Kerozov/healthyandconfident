import { createHash } from "node:crypto";
import { beforeEach, expect, mock, test } from "bun:test";

// Nothing here touches Supabase, the worker or the network.
const owner = {
  id: "11111111-1111-4111-8111-111111111111",
  username: "admin",
  display_name: "Главен админ",
  role: "owner",
  screens: [],
  active: true,
  last_seen_at: null,
};
let ownerRow = owner;

function ownerQuery() {
  const chain = {
    select: () => chain,
    eq: () => chain,
    retry: () => chain,
    abortSignal: () => chain,
    insert: () => chain,
    update: () => chain,
    maybeSingle: async () => ({ data: ownerRow, error: null }),
    single: async () => ({ data: ownerRow, error: null }),
    then: (resolve) => resolve({ data: null, error: null }),
  };
  return chain;
}

mock.module("server-only", () => ({}));
mock.module("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
mock.module("@/lib/supabase/admin", () => ({ getAdminClient: () => ({ from: ownerQuery }) }));

const calls = [];
const { getAdminSession } = await import("@/lib/admin/auth");

async function record(fn, args) {
  const session = await getAdminSession();
  calls.push({ fn, args, actor: session?.displayName ?? null });
  return session;
}

mock.module("@/lib/mcp/modules", () => ({
  MCP_MODULES: new Proxy(
    {},
    {
      get: () => async () => ({
        sendEmailCampaign: async (...args) => {
          await record("sendEmailCampaign", args);
          return { ok: true, id: "c1" };
        },
        previewAudience: async (...args) => {
          const session = await record("previewAudience", args);
          await new Promise((resolve) => setTimeout(resolve, 5));
          return { ok: true, emails: 3, phones: 1, label: session?.role ?? "none" };
        },
        getSubscribers: async () =>
          Array.from({ length: 250 }, (_, i) => ({ id: `s${i}`, email: `person${i}@example.com`, tags: ["a"] })),
        getPost: async (...args) => {
          await record("getPost", args);
          return null;
        },
        deletePost: async () => {
          throw new Error("boom");
        },
      }),
    },
  ),
}));

const rules = await import("@/lib/mcp/oauth-rules");
const { handleRpc } = await import("@/lib/mcp/rpc");
const { shapeResult, renderText } = await import("@/lib/mcp/shape");
const { callTool, TOOLS } = await import("@/lib/mcp/tools");
const { MCP_CATALOG, signatureKey } = await import("@/lib/mcp/catalog");
const { MCP_SIGNATURES } = await import("@/lib/mcp/catalog.generated");

const text = (result) => result.content[0].text;
const parsed = (result) => JSON.parse(text(result));

beforeEach(() => {
  calls.length = 0;
  ownerRow = owner;
});

test("PKCE S256 matches only the original verifier", () => {
  const verifier = "a".repeat(43) + "-._~";
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  expect(rules.pkceMatches(verifier, challenge)).toBe(true);
  expect(rules.pkceMatches(`${verifier}x`, challenge)).toBe(false);
  expect(rules.pkceMatches("short", challenge)).toBe(false);
});

test("redirect URIs: https or localhost only, exact match", () => {
  expect(rules.isAllowedRedirectUri("https://claude.ai/api/mcp/auth_callback")).toBe(true);
  expect(rules.isAllowedRedirectUri("http://localhost:6274/callback")).toBe(true);
  expect(rules.isAllowedRedirectUri("http://evil.example/callback")).toBe(false);
  expect(rules.isAllowedRedirectUri("https://claude.ai/cb#frag")).toBe(false);
  expect(rules.isAllowedRedirectUri("https://user:pw@claude.ai/cb")).toBe(false);
  expect(rules.redirectUriRegistered(["https://claude.ai/cb"], "https://claude.ai/cb/extra")).toBe(false);
});

test("bearer tokens need the connector prefix", () => {
  expect(rules.readBearer("Bearer hcmcp_abc")).toBe("hcmcp_abc");
  expect(rules.readBearer("Bearer lbmcp_abc")).toBeNull();
  expect(rules.readBearer(null)).toBeNull();
});

test("email codes are six digits and the address is masked", () => {
  expect(rules.newEmailCode()).toMatch(/^\d{6}$/);
  expect(rules.normalizeEmailCode(" 12-34 56 ")).toBe("123456");
  expect(rules.maskEmail("someone@gmail.com")).toBe("s***e@gmail.com");
  expect(rules.redirectWithCode("https://claude.ai/cb?x=1", { code: "c", state: "s" })).toBe(
    "https://claude.ai/cb?x=1&code=c&state=s",
  );
});

test("rpc: initialize, tools/list and notifications", async () => {
  const handlers = { listTools: () => [...TOOLS], callTool: async () => ({}) };
  const init = await handleRpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26" } }, handlers);
  expect(init?.result.protocolVersion).toBe("2025-03-26");
  const list = await handleRpc({ jsonrpc: "2.0", id: 2, method: "tools/list" }, handlers);
  expect(list?.result.tools.map((t) => t.name)).toEqual(["list_areas", "get_area_guide", "run_action"]);
  expect(await handleRpc({ jsonrpc: "2.0", method: "notifications/initialized" }, handlers)).toBeNull();
});

test("every catalog action has a generated signature", () => {
  for (const [area, def] of Object.entries(MCP_CATALOG)) {
    for (const [name, entry] of Object.entries(def.actions)) {
      expect(MCP_SIGNATURES[signatureKey(entry)], `${area}.${name}`).toBeDefined();
    }
  }
});

test("shape: search, fields and paging on the largest list", () => {
  const raw = { ok: true, rows: Array.from({ length: 30 }, (_, i) => ({ id: i, email: `p${i}@x.com`, extra: "y" })) };
  const shaped = shapeResult(raw, { search: "p1", fields: ["email"], limit: 5 });
  expect(shaped.page).toEqual({ path: "rows", total: 30, matched: 11, offset: 0, returned: 5 });
  expect(shaped.value.rows[0]).toEqual({ email: "p1@x.com" });
  expect(shapeResult(new Map([["a", 1]])).value).toEqual({ a: 1 });
  expect(renderText({ value: "x".repeat(200_000) })).toContain("отрязано");
});

test("sending without confirmed:true is refused and never runs", async () => {
  const result = await callTool("run_action", {
    area: "campaigns",
    action: "send_email",
    args: [{ subject: "Здравей", html: "<p>x</p>", audience: { mode: "segment", segment_keys: ["all"] } }],
  });
  expect(result.isError).toBe(true);
  expect(text(result)).toContain("confirmed: true");
  expect(calls).toHaveLength(0);
});

test("a confirmed send runs as the connector owner", async () => {
  const result = await callTool("run_action", {
    area: "campaigns",
    action: "send_email",
    confirmed: true,
    args: [{ subject: "Здравей", html: "<p>x</p>", audience: { mode: "segment", segment_keys: ["all"] } }],
  });
  expect(result.isError).toBeUndefined();
  expect(parsed(result).result).toEqual({ ok: true, id: "c1" });
  expect(calls[0]).toMatchObject({ fn: "sendEmailCampaign", actor: "Claude (MCP)" });
});

test("the connector identity never leaks outside its own call", async () => {
  expect(await getAdminSession()).toBeNull();
  const [a, b] = await Promise.all([
    callTool("run_action", { area: "campaigns", action: "preview_audience", args: [{ mode: "tags", tags: ["x"] }] }),
    callTool("run_action", { area: "campaigns", action: "preview_audience", args: [{ mode: "tags", tags: ["y"] }] }),
  ]);
  expect(parsed(a).result.label).toBe("owner");
  expect(parsed(b).result.label).toBe("owner");
  expect(await getAdminSession()).toBeNull();
});

test("no active owner means no access", async () => {
  ownerRow = { ...owner, active: false };
  const result = await callTool("run_action", { area: "blog", action: "get", args: ["id-1"] });
  expect(result.isError).toBe(true);
  expect(calls).toHaveLength(0);
});

test("arguments are checked against the signature", async () => {
  const missing = await callTool("run_action", { area: "blog", action: "get", args: [] });
  expect(missing.isError).toBe(true);
  expect(text(missing)).toContain("Липсва аргумент 1");
  const wrongType = await callTool("run_action", { area: "blog", action: "get", args: [42] });
  expect(text(wrongType)).toContain("низ");
  const tooMany = await callTool("run_action", { area: "blog", action: "get", args: ["a", "b"] });
  expect(text(tooMany)).toContain("Твърде много");
  const unknownField = await callTool("run_action", { area: "blog", action: "get", args: ["a"], sql: "drop" });
  expect(text(unknownField)).toContain("Непознато поле");
  const proto = await callTool("run_action", { area: "blog", action: "get", args: [JSON.parse('{"__proto__":{"x":1}}')] });
  expect(proto.isError).toBe(true);
  const unknownAction = await callTool("run_action", { area: "blog", action: "drop_table", args: [] });
  expect(text(unknownAction)).toContain("Непознато действие");
  expect(calls).toHaveLength(0);
});

test("long lists come back paged", async () => {
  const result = await callTool("run_action", { area: "subscribers", action: "list", search: "person1", limit: 3, fields: ["email"] });
  const body = parsed(result);
  expect(body.page).toMatchObject({ total: 250, returned: 3 });
  expect(body.result[0]).toEqual({ email: "person1@example.com" });
});

test("a thrown action reports a safe error", async () => {
  const result = await callTool("run_action", { area: "blog", action: "delete", confirmed: true, args: ["id", "bg"] });
  expect(result.isError).toBe(true);
  expect(text(result)).toContain("boom");
});

test("guide lists params and which actions need confirmation", async () => {
  const guide = parsed(await callTool("get_area_guide", { area: "campaigns" }));
  expect(guide.actions.send_email.needsConfirmation).toBeTruthy();
  expect(guide.actions.preview_audience.needsConfirmation).toBeUndefined();
  expect(guide.actions.send_email.params[0].type).toContain("audience");
  const areas = parsed(await callTool("list_areas", {}));
  expect(areas.map((a) => a.area)).toContain("automations");
});
