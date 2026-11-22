import "server-only";

import { connectorOwnerSession } from "@/lib/admin/auth";
import { withMcpConnectorSession } from "@/lib/mcp/actor";
import { MCP_CATALOG, signatureKey, type McpActionEntry, type McpEffect } from "@/lib/mcp/catalog";
import { MCP_SIGNATURES } from "@/lib/mcp/catalog.generated";
import { MCP_MODULES } from "@/lib/mcp/modules";
import { MCP_ACTOR_LABEL } from "@/lib/mcp/owner";
import { renderText, shapeResult, type ShapeOptions } from "@/lib/mcp/shape";

export type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

const reply = (value: unknown, isError = false): ToolResult => ({
  content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value) }],
  ...(isError ? { isError: true } : {}),
});

const AREA_KEYS = Object.keys(MCP_CATALOG) as (keyof typeof MCP_CATALOG)[];

const EFFECT_LABEL: Record<McpEffect, string> = {
  send: "праща имейл/СМС навън",
  delete: "трие",
  publish: "публикува",
  bulk: "променя много записи наведнъж",
};

function effectOf(entry: McpActionEntry): McpEffect | undefined {
  if (entry.effect) return entry.effect;
  const audit = MCP_SIGNATURES[signatureKey(entry)]?.auditAction;
  return audit === "send" || audit === "delete" || audit === "publish" ? audit : undefined;
}

function areaActions(area: string): Record<string, McpActionEntry> | null {
  if (!Object.hasOwn(MCP_CATALOG, area)) return null;
  return MCP_CATALOG[area as keyof typeof MCP_CATALOG].actions as Record<string, McpActionEntry>;
}

export const TOOLS = [
  {
    name: "list_areas",
    title: "Раздели на админа",
    description: "Разделите на админа на Healthy & Confident и имената на действията във всеки. Започни оттук.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
  },
  {
    name: "get_area_guide",
    title: "Действията в раздел",
    description: "Всяко действие в раздела: какво прави, точните параметри (TypeScript типове), какво връща и дали праща/трие/публикува. Чети го преди първия run_action в раздела.",
    inputSchema: {
      type: "object",
      properties: { area: { type: "string", enum: AREA_KEYS, description: "Раздел от list_areas" } },
      required: ["area"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "run_action",
    title: "Изпълни действие в админа",
    description:
      "Изпълнява действие от get_area_guide със същите проверки и одит като бутона в панела. args е масивът с аргументите по ред (обикновено един обект). Големите списъци се режат със search/fields/offset/limit/path. Действията, които пращат, трият, публикуват или променят много записи, искат confirmed: true — само след изрично указание от собственика в чата.",
    inputSchema: {
      type: "object",
      properties: {
        area: { type: "string", enum: AREA_KEYS },
        action: { type: "string", description: "Име на действие от get_area_guide" },
        args: { type: "array", description: "Аргументите по ред, напр. [{ \"email\": \"…\" }] или [\"id\"]. Празен масив за действия без аргументи.", items: {} },
        confirmed: { type: "boolean", description: "true само ако собственикът изрично е казал да се прати/изтрие/публикува точно това." },
        search: { type: "string", description: "Филтър по подниз в записите на дълъг списък." },
        fields: { type: "array", items: { type: "string" }, description: "Само тези полета от всеки запис." },
        offset: { type: "number" },
        limit: { type: "number", description: "По подразбиране 100, най-много 1000." },
        path: { type: "string", description: "Точков път до списъка в отговора, ако не е най-дългият." },
      },
      required: ["area", "action"],
      additionalProperties: false,
    },
    annotations: { destructiveHint: true, openWorldHint: true },
  },
] as const;

const safeKeys = (value: unknown, depth = 0): boolean =>
  depth <= 30 &&
  (!value ||
    typeof value !== "object" ||
    Object.entries(value).every(
      ([key, child]) => !["__proto__", "prototype", "constructor"].includes(key) && safeKeys(child, depth + 1),
    ));

function listAreas(): ToolResult {
  return reply(
    AREA_KEYS.map((key) => ({
      area: key,
      title: MCP_CATALOG[key].title,
      about: MCP_CATALOG[key].about,
      actions: Object.keys(MCP_CATALOG[key].actions),
    })),
  );
}

function areaGuide(area: unknown): ToolResult {
  const actions = typeof area === "string" ? areaActions(area) : null;
  if (!actions) return reply({ error: "Непознат раздел. Виж list_areas." }, true);
  const key = area as keyof typeof MCP_CATALOG;
  return reply({
    area: key,
    title: MCP_CATALOG[key].title,
    about: MCP_CATALOG[key].about,
    howTo: "run_action({ area, action, args: [...] }). args следва params по ред; незадължителните в края може да се пропуснат.",
    actions: Object.fromEntries(
      Object.entries(actions).map(([name, entry]) => {
        const sig = MCP_SIGNATURES[signatureKey(entry)];
        const effect = effectOf(entry);
        return [
          name,
          {
            does: entry.note || sig?.summary || sig?.doc || entry.fn,
            ...(sig?.doc && sig.doc !== entry.note ? { doc: sig.doc } : {}),
            params: sig?.params ?? [],
            returns: sig?.returns ?? "unknown",
            ...(effect ? { needsConfirmation: EFFECT_LABEL[effect] } : {}),
          },
        ];
      }),
    ),
  });
}

function checkArgs(entry: McpActionEntry, args: unknown[]): string | null {
  const sig = MCP_SIGNATURES[signatureKey(entry)];
  if (!sig) return "Действието няма описание. Пусни `bun run mcp:catalog`.";
  if (args.length > sig.params.length) return `Твърде много аргументи: очакват се ${sig.params.length}.`;
  for (const [index, param] of sig.params.entries()) {
    const value = args[index];
    if (value === undefined) {
      if (!param.optional) return `Липсва аргумент ${index + 1} (${param.name}: ${param.type.slice(0, 200)}).`;
      continue;
    }
    const simple = param.type.trim();
    if (simple === "string" && typeof value !== "string") return `${param.name} трябва да е низ.`;
    if (simple === "number" && typeof value !== "number") return `${param.name} трябва да е число.`;
    if (simple === "boolean" && typeof value !== "boolean") return `${param.name} трябва да е true или false.`;
    if (/^[\w']+\[\]$/.test(simple) && !Array.isArray(value)) return `${param.name} трябва да е масив.`;
  }
  return null;
}

function failed(value: unknown): boolean {
  if (value === null || value === undefined || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.ok === false || record.success === false;
}

async function runAction(input: Record<string, unknown>): Promise<ToolResult> {
  const allowed = new Set(["area", "action", "args", "confirmed", "search", "fields", "offset", "limit", "path"]);
  if (Object.keys(input).some((key) => !allowed.has(key))) return reply({ error: "Непознато поле." }, true);
  const actions = typeof input.area === "string" ? areaActions(input.area) : null;
  if (!actions) return reply({ error: "Непознат раздел. Виж list_areas." }, true);
  const name = input.action;
  if (typeof name !== "string" || !Object.hasOwn(actions, name)) {
    return reply({ error: `Непознато действие. Виж get_area_guide("${input.area}").` }, true);
  }
  const entry = actions[name];
  const args = input.args === undefined ? [] : input.args;
  if (!Array.isArray(args)) return reply({ error: "args трябва да е масив с аргументите по ред." }, true);
  if (!safeKeys(args)) return reply({ error: "Невалидни данни." }, true);
  if (JSON.stringify(args).length > 3_500_000) return reply({ error: "Твърде големи данни (над 3,5 MB)." }, true);
  const invalid = checkArgs(entry, args);
  if (invalid) return reply({ error: invalid }, true);

  const effect = effectOf(entry);
  if (effect && input.confirmed !== true) {
    return reply(
      {
        error: `Това действие ${EFFECT_LABEL[effect]}. Кажи на собственика какво точно ще стане (до кого, колко, кога) и пусни отново с confirmed: true само след изричното му „да“.`,
      },
      true,
    );
  }

  const session = await connectorOwnerSession(MCP_ACTOR_LABEL);
  if (!session) return reply({ error: "Главният админ не е активен. Влез в панела и опитай пак." }, true);

  const mod = await MCP_MODULES[entry.source]();
  const fn = mod[entry.fn];
  if (typeof fn !== "function") return reply({ error: "Действието липсва в кода." }, true);

  let value: unknown;
  try {
    value = await withMcpConnectorSession(session, () => Promise.resolve((fn as (...a: unknown[]) => unknown)(...args)));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[mcp] action failed", input.area, name, message);
    const shown = /NEXT_REDIRECT|NEXT_NOT_FOUND/.test(message) ? "Действието пренасочи страницата." : message.slice(0, 400);
    return reply(
      { error: `Действието не завърши: ${shown}`, hint: "Прочети текущото състояние преди нов опит; не повтаряй изпращане на сляпо." },
      true,
    );
  }

  const shape: ShapeOptions = {
    path: typeof input.path === "string" ? input.path : undefined,
    search: typeof input.search === "string" ? input.search : undefined,
    fields: Array.isArray(input.fields) ? (input.fields.filter((f) => typeof f === "string") as string[]) : undefined,
    offset: typeof input.offset === "number" ? input.offset : undefined,
    limit: typeof input.limit === "number" ? input.limit : undefined,
  };
  const shaped = shapeResult(value ?? null, shape);
  return { content: [{ type: "text", text: renderText(shaped) }], ...(failed(value) ? { isError: true } : {}) };
}

export async function callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  switch (name) {
    case "list_areas":
      return listAreas();
    case "get_area_guide":
      return areaGuide(args.area);
    case "run_action":
      return runAction(args);
    default:
      return reply({ error: `Непознат инструмент: ${name}` }, true);
  }
}
