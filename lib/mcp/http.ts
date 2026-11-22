import { NextResponse } from "next/server";

/**
 * Общото за маршрутите на конектора: CORS (claude.ai пита и от браузъра) и
 * адресите, изведени от заявката — така откриването работи и на сайта, и през
 * тунел при разработка, без да се пише хост на ръка.
 */

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Mcp-Session-Id, Mcp-Protocol-Version",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
};

export const originOf = (request: Request): string => {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost) return `${forwardedProto ?? "https"}://${forwardedHost.split(",")[0].trim()}`;
  return new URL(request.url).origin;
};

export const json = (body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) =>
  NextResponse.json(body, {
    status: init.status ?? 200,
    headers: { ...CORS_HEADERS, "Cache-Control": "no-store", ...init.headers },
  });

export const preflight = () => new NextResponse(null, { status: 204, headers: CORS_HEADERS });

export const AUTHORIZE_PATH = "/admin/connect/claude";

export const resourceMetadataUrl = (origin: string) => `${origin}/.well-known/oauth-protected-resource`;

export const authorizationServerMetadata = (origin: string) => ({
  issuer: origin,
  authorization_endpoint: `${origin}${AUTHORIZE_PATH}`,
  token_endpoint: `${origin}/api/oauth/token`,
  registration_endpoint: `${origin}/api/oauth/register`,
  response_types_supported: ["code"],
  grant_types_supported: ["authorization_code", "refresh_token"],
  code_challenge_methods_supported: ["S256"],
  token_endpoint_auth_methods_supported: ["none"],
  scopes_supported: ["admin"],
});

export const protectedResourceMetadata = (origin: string) => ({
  resource: `${origin}/api/mcp`,
  authorization_servers: [origin],
  bearer_methods_supported: ["header"],
  scopes_supported: ["admin"],
  resource_name: "Healthy & Confident — админ",
});
