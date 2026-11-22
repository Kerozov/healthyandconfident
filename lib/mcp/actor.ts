import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import type { AdminActorPublic } from "@/lib/admin/actor-types";

/**
 * Сесията на конектора. Задава я само `/api/mcp` след проверен токен и само за
 * едно извикване; аргументите на инструментите не могат да я пипнат. Извън това
 * извикване админът си чете бисквитката както винаги.
 */
const connectorSessions = new AsyncLocalStorage<AdminActorPublic>();

export function mcpConnectorSession(): AdminActorPublic | null {
  return connectorSessions.getStore() ?? null;
}

export function withMcpConnectorSession<T>(
  session: AdminActorPublic,
  work: () => Promise<T>,
): Promise<T> {
  return connectorSessions.run(session, work);
}
