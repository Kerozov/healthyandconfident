import { json, preflight } from "@/lib/mcp/http";
import { exchangeCode, refreshTokens } from "@/lib/mcp/oauth";
import { createRateLimiter, requestIp } from "@/lib/util/rate-limit";

/** Код → токен (с PKCE) и подновяване. Тялото е form-urlencoded по спецификация; JSON също минава. */
export const dynamic = "force-dynamic";

const rateLimited = createRateLimiter(60, 60_000);

export const OPTIONS = preflight;

async function readBody(request: Request): Promise<Record<string, string>> {
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(body).map(([key, value]) => [key, String(value ?? "")]));
  }
  return Object.fromEntries(new URLSearchParams(await request.text()).entries());
}

export async function POST(request: Request) {
  if (rateLimited(requestIp(request))) {
    return json({ error: "too_many_requests" }, { status: 429 });
  }
  const body = await readBody(request);
  const result =
    body.grant_type === "authorization_code"
      ? await exchangeCode({
          code: body.code ?? "",
          clientId: body.client_id ?? "",
          redirectUri: body.redirect_uri ?? "",
          codeVerifier: body.code_verifier ?? "",
        })
      : body.grant_type === "refresh_token"
        ? await refreshTokens({ refreshToken: body.refresh_token ?? "", clientId: body.client_id ?? "" })
        : { ok: false as const, error: "unsupported_grant_type", description: "authorization_code or refresh_token" };

  if (!result.ok) {
    return json(
      { error: result.error, error_description: result.description },
      { status: result.error === "server_error" ? 500 : 400 },
    );
  }
  return json(result.body);
}
