/** Use the ordinary hyphen in visible copy, including old CMS content. */
export function shortDashes(text: string): string {
  return text.replace(/[\u2012-\u2015]|&(?:mdash|ndash);|&#(?:821[0-3]|x201[2-5]);/gi, "-");
}

const DISPLAY_FIELDS = new Set([
  "title", "description", "excerpt", "seo_title", "seo_description", "label",
  "cta_label", "button_label", "badge", "duration", "price", "price_label",
  "headline", "offer_headline", "message", "success_message", "thank_you",
  "placeholder", "help", "text", "caption", "alt", "author", "features", "phone", "name", "topic",
]);

/** Normalize display fields only. URLs, IDs, tags and raw Markdown stay intact. */
export function normalizeDisplayText<T>(data: T): T {
  function visit(value: unknown, display = false): unknown {
    if (typeof value === "string") return display ? shortDashes(value) : value;
    if (Array.isArray(value)) return value.map((item) => visit(item, display));
    if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [
        key, visit(item, DISPLAY_FIELDS.has(key.replace(/_(bg|en)$/, ""))),
      ]));
    }
    return value;
  }
  return visit(data) as T;
}

type MarkdownTextNode = {
  type: string;
  value?: string;
  alt?: string | null;
  title?: string | null;
  children?: MarkdownTextNode[];
};

/** Work on parsed text so link destinations, code and recommendation JSON are preserved. */
export function remarkShortDashes() {
  return (tree: MarkdownTextNode) => {
    function walk(node: MarkdownTextNode) {
      if (node.type === "text" && node.value) node.value = shortDashes(node.value);
      if (node.type === "image" && node.alt) node.alt = shortDashes(node.alt);
      if ((node.type === "image" || node.type === "link") && node.title) {
        node.title = shortDashes(node.title);
      }
      node.children?.forEach(walk);
    }
    walk(tree);
  };
}
