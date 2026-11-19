/**
 * The Facebook field holds a profile link or, more often, just the name the
 * person typed („Мария Иванова“). A name becomes a Facebook people search
 * instead of a broken `https://Мария Иванова`.
 */
export function facebookLink(
  value: string | null | undefined,
): { href: string; text: string; isProfile: boolean } | null {
  const v = value?.trim();
  if (!v) return null;

  if (/^(https?:\/\/)?((www|m|web|mobile)\.)?(facebook|fb)\.com\//i.test(v)) {
    return {
      href: /^https?:\/\//i.test(v) ? v : `https://${v}`,
      text: v.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/+$/, ""),
      isProfile: true,
    };
  }
  if (/^https?:\/\/\S+$/i.test(v)) return { href: v, text: v, isProfile: true };

  return {
    href: `https://www.facebook.com/search/people/?q=${encodeURIComponent(v)}`,
    text: v,
    isProfile: false,
  };
}
