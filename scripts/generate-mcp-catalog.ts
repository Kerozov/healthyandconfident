/**
 * Извежда параметрите на всяко действие от каталога на конектора направо от
 * TypeScript типовете и ги пише в `lib/mcp/catalog.generated.ts`.
 *
 *   bun run mcp:catalog          — пише файла
 *   bun run mcp:catalog --check  — само проверява, че е актуален (за CI)
 *
 * Така Claude вижда точната форма на входа, без да се поддържа втори списък
 * на ръка: промени ли се функцията, `--check` пада, докато не се пусне отново.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { MCP_CATALOG, MCP_SOURCES, signatureKey, type McpActionEntry } from "../lib/mcp/catalog";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outFile = path.join(root, "lib/mcp/catalog.generated.ts");
const check = process.argv.includes("--check");

const configPath = ts.findConfigFile(root, ts.sys.fileExists, "tsconfig.json");
if (!configPath) throw new Error("tsconfig.json not found");
const config = ts.readConfigFile(configPath, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const sourceFiles = [...new Set(Object.values(MCP_SOURCES))].map((file) => path.join(root, file));
const program = ts.createProgram(sourceFiles, { ...parsed.options, noEmit: true });
const checker = program.getTypeChecker();

const OPAQUE = new Set(["Date", "Map", "Set", "Promise", "Uint8Array", "File", "Blob", "FormData", "Buffer", "RegExp"]);
const FLAGS = ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseSingleQuotesForStringLiteralType;
const MAX_PARAM = 6000;
const MAX_RETURN = 900;

function plain(type: ts.Type): string {
  return checker.typeToString(type, undefined, FLAGS);
}

function propName(symbol: ts.Symbol): string {
  const name = symbol.getName();
  return /^[A-Za-z_$][\w$]*$/.test(name) ? name : JSON.stringify(name);
}

function docOf(symbol: ts.Symbol): string {
  return ts.displayPartsToString(symbol.getDocumentationComment(checker)).replace(/\s+/g, " ").trim();
}

/** Разгъва псевдонимите и интерфейсите до полета, за да се вижда формата. */
function show(type: ts.Type, depth: number, seen: Set<ts.Type>, optional = false): string {
  if (type.flags & ts.TypeFlags.Boolean) return "boolean";
  if (type.isUnion()) {
    // An optional field's `| undefined` is already said by its `?`.
    const parts = optional ? type.types.filter((t) => !(t.flags & ts.TypeFlags.Undefined)) : type.types;
    const isBool = (t: ts.Type) => Boolean(t.flags & ts.TypeFlags.BooleanLiteral);
    const bothBools = parts.filter(isBool).length === 2;
    const rendered = parts.filter((t) => !(bothBools && isBool(t))).map((t) => show(t, depth, seen));
    if (bothBools) rendered.push("boolean");
    return [...new Set(rendered)].join(" | ");
  }
  if (!(type.flags & ts.TypeFlags.Object)) return plain(type);

  const symbolName = type.getSymbol()?.getName() ?? type.aliasSymbol?.getName() ?? "";
  if (OPAQUE.has(symbolName)) return plain(type);
  if (checker.isArrayType(type)) {
    const [item] = checker.getTypeArguments(type as ts.TypeReference);
    const inner = item ? show(item, depth, seen) : "unknown";
    return /[|&]/.test(inner) ? `(${inner})[]` : `${inner}[]`;
  }
  if (checker.isTupleType(type)) {
    return `[${checker.getTypeArguments(type as ts.TypeReference).map((t) => show(t, depth, seen)).join(", ")}]`;
  }
  if (type.getCallSignatures().length) return plain(type);
  if (depth <= 0 || seen.has(type)) return plain(type);

  const next = new Set(seen).add(type);
  const fields: string[] = [];
  for (const info of checker.getIndexInfosOfType(type)) {
    fields.push(`[key: ${plain(info.keyType)}]: ${show(info.type, depth - 1, next)}`);
  }
  for (const prop of checker.getPropertiesOfType(type)) {
    const declaration = prop.valueDeclaration ?? prop.declarations?.[0];
    if (!declaration) continue;
    const optional = Boolean(prop.flags & ts.SymbolFlags.Optional);
    const propType = checker.getTypeOfSymbolAtLocation(prop, declaration);
    const doc = docOf(prop);
    fields.push(`${doc ? `/** ${doc} */ ` : ""}${propName(prop)}${optional ? "?" : ""}: ${show(propType, depth - 1, next, optional)}`);
  }
  return fields.length ? `{ ${fields.join("; ")} }` : plain(type);
}

function bounded(type: ts.Type, limit: number, depths: number[], optional = false): string {
  for (const depth of depths) {
    const text = show(type, depth, new Set(), optional);
    if (text.length <= limit) return text;
  }
  const text = show(type, 0, new Set(), optional);
  return text.length <= limit ? text : `${text.slice(0, limit)}…`;
}

function unwrapPromise(type: ts.Type): ts.Type {
  const symbol = type.getSymbol();
  if (symbol?.getName() === "Promise") {
    const [inner] = checker.getTypeArguments(type as ts.TypeReference);
    if (inner) return inner;
  }
  return type;
}

/** `summary` и `action` от първата проверка за достъп — одитното описание. */
function auditOf(body: ts.Node | undefined): { summary: string; action: string } {
  let found = { summary: "", action: "" };
  const visit = (node: ts.Node): void => {
    if (found.summary) return;
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      ["guardAction", "requireAdmin", "requireOwner", "guard"].includes(node.expression.text)
    ) {
      for (const arg of node.arguments) {
        if (!ts.isObjectLiteralExpression(arg)) continue;
        const read = (key: string) => {
          const prop = arg.properties.find(
            (p): p is ts.PropertyAssignment => ts.isPropertyAssignment(p) && p.name.getText() === key,
          );
          return prop && ts.isStringLiteralLike(prop.initializer) ? prop.initializer.text : "";
        };
        found = { summary: read("summary"), action: read("action") };
      }
    }
    ts.forEachChild(node, visit);
  };
  if (body) visit(body);
  return found;
}

type Signature = {
  params: { name: string; type: string; optional: boolean }[];
  returns: string;
  doc: string;
  summary: string;
  auditAction: string;
};

function signatureOf(entry: McpActionEntry): Signature {
  const file = path.join(root, MCP_SOURCES[entry.source]);
  const source = program.getSourceFile(file);
  if (!source) throw new Error(`Missing source ${file}`);
  const moduleSymbol = checker.getSymbolAtLocation(source);
  if (!moduleSymbol) throw new Error(`No module symbol for ${file}`);
  const exported = checker.getExportsOfModule(moduleSymbol).find((s) => s.getName() === entry.fn);
  if (!exported) throw new Error(`${entry.fn} is not exported from ${MCP_SOURCES[entry.source]}`);
  const symbol = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
  const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0];
  if (!declaration) throw new Error(`${entry.fn} has no declaration`);
  const fnType = checker.getTypeOfSymbolAtLocation(symbol, declaration);
  const [signature] = fnType.getCallSignatures();
  if (!signature) throw new Error(`${entry.fn} is not a function`);

  const params = signature.getParameters().map((param) => {
    const paramDecl = param.valueDeclaration as ts.ParameterDeclaration | undefined;
    const optional = Boolean(paramDecl && (paramDecl.questionToken || paramDecl.initializer));
    const type = checker.getTypeOfSymbolAtLocation(param, paramDecl ?? declaration);
    return { name: param.getName(), type: bounded(type, MAX_PARAM, [6, 4, 3, 2, 1], optional), optional };
  });
  const returns = bounded(unwrapPromise(signature.getReturnType()), MAX_RETURN, [3, 2, 1]);
  const body = ts.isFunctionDeclaration(declaration) ? declaration.body : undefined;
  const audit = auditOf(body);
  return { params, returns, doc: docOf(symbol), summary: audit.summary, auditAction: audit.action };
}

const signatures: Record<string, Signature> = {};
const problems: string[] = [];
for (const [areaKey, area] of Object.entries(MCP_CATALOG)) {
  for (const [actionKey, entry] of Object.entries(area.actions) as [string, McpActionEntry][]) {
    try {
      signatures[signatureKey(entry)] = signatureOf(entry);
    } catch (err) {
      problems.push(`${areaKey}.${actionKey}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}

const sorted = Object.fromEntries(Object.entries(signatures).sort(([a], [b]) => a.localeCompare(b)));
const output = `// Generated by scripts/generate-mcp-catalog.ts — do not edit. Run \`bun run mcp:catalog\`.
import type { McpSignature } from "@/lib/mcp/catalog-types";

export const MCP_SIGNATURES: Record<string, McpSignature> = ${JSON.stringify(sorted, null, 2)};
`;

if (check) {
  let current = "";
  try {
    current = readFileSync(outFile, "utf8");
  } catch {
    /* missing */
  }
  if (current !== output) {
    console.error("lib/mcp/catalog.generated.ts is stale. Run `bun run mcp:catalog`.");
    process.exit(1);
  }
  console.log(`MCP catalog is up to date (${Object.keys(sorted).length} actions).`);
} else {
  writeFileSync(outFile, output);
  console.log(`Wrote ${Object.keys(sorted).length} action signatures to lib/mcp/catalog.generated.ts`);
}
