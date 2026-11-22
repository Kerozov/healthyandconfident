import { NextResponse } from "next/server";
import { CORS_HEADERS, json, originOf, preflight, resourceMetadataUrl } from "@/lib/mcp/http";
import { grantForAccessToken } from "@/lib/mcp/oauth";
import { readBearer } from "@/lib/mcp/oauth-rules";
import { handleRpc, isRpcRequest, rpcError, type RpcReply } from "@/lib/mcp/rpc";
import { callTool, TOOLS } from "@/lib/mcp/tools";
import { createRateLimiter } from "@/lib/util/rate-limit";

/**
 * Конекторът на Claude към целия админ: собственикът добавя `https://<сайта>/api/mcp`
 * в Claude като custom connector и потвърждава с код по имейл.
 *
 * Без токен — 401 с адреса на описанието на ресурса: оттам Claude намира входа.
 * Синхронизациите и изпращанията вървят през worker-а, затова времето е щедро.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Спирачка срещу зациклил агент: 300 действия на час на инстанс. */
const callLimited = createRateLimiter(300, 60 * 60_000);

export const OPTIONS = preflight;

function unauthorized(request: Request) {
  return new NextResponse(JSON.stringify({ error: "invalid_token" }), {
    status: 401,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
      "WWW-Authenticate": `Bearer resource_metadata="${resourceMetadataUrl(originOf(request))}"`,
    },
  });
}

export const GET = () =>
  new NextResponse(null, { status: 405, headers: { ...CORS_HEADERS, Allow: "POST, OPTIONS" } });

export async function POST(request: Request) {
  const token = readBearer(request.headers.get("authorization"));
  if (!token) return unauthorized(request);
  let grant: Awaited<ReturnType<typeof grantForAccessToken>>;
  try {
    grant = await grantForAccessToken(token);
  } catch (error) {
    // A database hiccup is not a bad token: 401 would make Claude drop the connection.
    console.error("[mcp] token lookup", error instanceof Error ? error.message : error);
    return json(rpcError(null, -32603, "Временна грешка. Опитай пак."), { status: 503 });
  }
  if (!grant) return unauthorized(request);

  const body = await request.json().catch(() => undefined);
  const batch = Array.isArray(body) ? body : [body];
  if (!batch.length || !batch.every(isRpcRequest)) {
    return json(rpcError(null, -32600, "Invalid Request"), { status: 400 });
  }

  const calls = batch.filter((item) => item.method === "tools/call").length;
  for (let i = 0; i < calls; i += 1) {
    if (callLimited(grant.clientId)) {
      return json(rpcError(batch[0].id, -32000, "Твърде много действия за час. Изчакай малко."), { status: 429 });
    }
  }

  const replies: RpcReply[] = [];
  for (const item of batch) {
    try {
      const reply = await handleRpc(item, {
        listTools: () => [...TOOLS],
        callTool: (name, args) => callTool(name, args),
      });
      if (reply) replies.push(reply);
    } catch (error) {
      console.error("[mcp]", item.method, error instanceof Error ? error.message : error);
      replies.push(rpcError(item.id, -32603, "Временна грешка. Опитай пак."));
    }
  }

  if (!replies.length) return new NextResponse(null, { status: 202, headers: CORS_HEADERS });
  return json(Array.isArray(body) ? replies : replies[0]);
}
