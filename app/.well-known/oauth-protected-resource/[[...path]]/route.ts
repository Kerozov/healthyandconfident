import { json, originOf, preflight, protectedResourceMetadata } from "@/lib/mcp/http";

/** RFC 9728 — кой сървър за вход пази `/api/mcp`. С и без наставката на ресурса. */
export const dynamic = "force-dynamic";

export const GET = (request: Request) => json(protectedResourceMetadata(originOf(request)));
export const OPTIONS = preflight;
