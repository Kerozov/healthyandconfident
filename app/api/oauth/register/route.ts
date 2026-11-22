import { json, preflight } from "@/lib/mcp/http";
import { registerClient } from "@/lib/mcp/oauth";
import { createRateLimiter, requestIp } from "@/lib/util/rate-limit";

/**
 * Динамична регистрация (RFC 7591). Claude се регистрира сам при добавянето на
 * конектора; клиентът е публичен (без тайна) — пази го PKCE, а достъпа —
 * кодът по имейл на собственика.
 */
export const dynamic = "force-dynamic";

const rateLimited = createRateLimiter(20, 60 * 60_000);

export const OPTIONS = preflight;

export async function POST(request: Request) {
  if (rateLimited(requestIp(request))) {
    return json({ error: "too_many_requests" }, { status: 429 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return json({ error: "invalid_client_metadata" }, { status: 400 });
  const result = await registerClient({ name: body.client_name, redirectUris: body.redirect_uris });
  if (!result.ok) {
    return result.error === "server_error"
      ? json({ error: "server_error" }, { status: 500 })
      : json({ error: "invalid_redirect_uri", error_description: result.error }, { status: 400 });
  }
  return json(
    {
      client_id: result.client.id,
      client_name: result.client.name,
      redirect_uris: result.client.redirectUris,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      client_id_issued_at: Math.floor(Date.now() / 1000),
    },
    { status: 201 },
  );
}
