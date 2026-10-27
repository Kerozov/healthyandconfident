import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const fix = process.argv.includes("--fix");
const longDash = /[\u2012-\u2015]|&(?:mdash|ndash);|&#(?:821[0-3]|x201[2-5]);|\\u201[2-5]/gi;
let changedFiles = 0;
let occurrences = 0;

async function scan(directory: string) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) { await scan(filename); continue; }
    if (!/\.(tsx?|jsx?)$/.test(filename)) continue;
    const source = await readFile(filename, "utf8");
    const tree = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
    const edits: { start: number; end: number; text: string }[] = [];
    function walk(node: ts.Node) {
      // Comments, operators and regexes are implementation, not visible copy.
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node) || ts.isJsxText(node)) {
        const start = node.getStart(tree);
        const raw = source.slice(start, node.end);
        const matches = raw.match(longDash);
        if (matches) {
          occurrences += matches.length;
          edits.push({ start, end: node.end, text: raw.replace(longDash, "-") });
        }
      }
      ts.forEachChild(node, walk);
    }
    walk(tree);
    if (!edits.length) continue;
    changedFiles += 1;
    if (!fix) { console.error(filename); continue; }
    let next = source;
    for (const edit of edits.sort((a, b) => b.start - a.start)) {
      next = next.slice(0, edit.start) + edit.text + next.slice(edit.end);
    }
    await writeFile(filename, next);
  }
}

for (const root of ["app", "components", "i18n", "lib"]) await scan(root);
if (!fix && occurrences) {
  throw new Error(`${occurrences} long dashes in visible copy across ${changedFiles} files.`);
}
console.log(fix ? `Replaced ${occurrences} long dashes in ${changedFiles} files.` : "Visible source copy contains no long dashes.");
