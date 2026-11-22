/**
 * MCP по JSON-RPC, без състояние (Streamable HTTP, отговор като `application/json`).
 *
 * Без SDK: протоколът тук е пет метода, а сървърът на SDK иска Node `req`/`res`,
 * каквито маршрутът на Next няма. Инструментите са в `lib/mcp/tools.ts`; тук е само
 * пощата — кой метод, кой отговор, коя грешка. Без IO, за да се тества.
 */

export const SUPPORTED_PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"] as const;
export const SERVER_INFO = {
  name: "healthyandconfident-admin",
  title: "Healthy & Confident — админ",
  version: "1.0.0",
};

export const SERVER_INSTRUCTIONS = `Целият админ на сайта Healthy & Confident (Веси Ней): имейл и СМС кампании, автоматизации, абонати, сегменти и статуси, форми и въпросници, статии, съдържание на сайта, програми и продукти, Black Friday, плащания, статистика, Zoom, Meta, Launchify и екипът.
Как се работи:
- list_areas показва разделите. get_area_guide(area) дава всяко действие с точните параметри. После run_action(area, action, args). args е масивът с аргументите на функцията, по ред.
- Преди запис прочети текущото състояние със съответното четене и пази полетата, които не се сменят. Не измисляй id — само от четене.
- Големите списъци се режат: search, fields, offset и limit в run_action. Не тегли всичко, ако търсиш един човек.
- Изпращане (кампания, тест, СМС, автоматизация сега), изтриване, публикуване и плащане — само по изрично указание на собственика в чата. Преди кампания преброй аудиторията с campaigns.preview_audience и кажи броя, сегмента и часа.
- След неясен отговор от изпращане първо прочети кампаниите; не повтаряй send на сляпо.
- Часовете са Europe/Sofia. Пиши на жив български. Не измисляй отзиви, числа и обещания.`;

export type RpcRequest = {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
};

export type RpcReply = {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string };
};

export const isRpcRequest = (value: unknown): value is RpcRequest =>
  Boolean(value) &&
  typeof value === "object" &&
  (value as RpcRequest).jsonrpc === "2.0" &&
  typeof (value as RpcRequest).method === "string";

export const negotiateProtocol = (requested: unknown): string =>
  typeof requested === "string" && (SUPPORTED_PROTOCOLS as readonly string[]).includes(requested)
    ? requested
    : SUPPORTED_PROTOCOLS[0];

export const rpcError = (id: RpcRequest["id"], code: number, message: string): RpcReply => ({
  jsonrpc: "2.0",
  id: id ?? null,
  error: { code, message },
});

export type RpcHandlers = {
  listTools: () => unknown[] | Promise<unknown[]>;
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
};

/** Един метод. Известие (без `id`) не получава отговор — връща `null`. */
export async function handleRpc(request: RpcRequest, handlers: RpcHandlers): Promise<RpcReply | null> {
  const id = request.id ?? null;
  const notification = request.id === undefined;
  switch (request.method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: negotiateProtocol(request.params?.protocolVersion),
          capabilities: { tools: { listChanged: false } },
          serverInfo: SERVER_INFO,
          instructions: SERVER_INSTRUCTIONS,
        },
      };
    case "ping":
      return { jsonrpc: "2.0", id, result: {} };
    case "tools/list":
      return { jsonrpc: "2.0", id, result: { tools: await handlers.listTools() } };
    case "tools/call": {
      const name = typeof request.params?.name === "string" ? request.params.name : "";
      const args = request.params?.arguments;
      if (!name) return rpcError(id, -32602, "tools/call needs a name");
      return {
        jsonrpc: "2.0",
        id,
        result: await handlers.callTool(
          name,
          args && typeof args === "object" && !Array.isArray(args) ? (args as Record<string, unknown>) : {},
        ),
      };
    }
    default:
      if (notification || request.method.startsWith("notifications/")) return null;
      return rpcError(id, -32601, `Method not found: ${request.method}`);
  }
}
