import { authorizationServerMetadata, json, originOf, preflight } from "@/lib/mcp/http";

/** RFC 8414 — къде е входът, токенът и регистрацията за конектора на Claude. */
export const dynamic = "force-dynamic";

export const GET = (request: Request) => json(authorizationServerMetadata(originOf(request)));
export const OPTIONS = preflight;
