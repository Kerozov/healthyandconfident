export function toggleMarkdownFormat(value: string, start: number, end: number, marker: "**" | "*") {
  const selected = value.slice(start, end);
  const width = marker.length;
  if (selected.length > width * 2 && selected.startsWith(marker) && selected.endsWith(marker)) {
    const text = selected.slice(width, -width);
    return { value: value.slice(0, start) + text + value.slice(end), start, end: start + text.length };
  }
  if (start >= width && value.slice(start - width, start) === marker && value.slice(end, end + width) === marker) {
    return { value: value.slice(0, start - width) + selected + value.slice(end + width), start: start - width, end: end - width };
  }
  const leading = selected.match(/^\s*/)?.[0] || "";
  const trailing = selected.trim() ? selected.match(/\s*$/)?.[0] || "" : "";
  const text = selected.trim() || (marker === "**" ? "удебелен текст" : "курсив");
  const snippet = `${leading}${marker}${text}${marker}${trailing}`;
  const nextStart = start + leading.length + width;
  return { value: value.slice(0, start) + snippet + value.slice(end), start: nextStart, end: nextStart + text.length };
}
