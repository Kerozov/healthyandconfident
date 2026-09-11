/** Extract a YouTube video id from common URL formats. */
export function parseYoutubeVideoId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = parsed.pathname.slice(1).split("/")[0];
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      const v = parsed.searchParams.get("v");
      if (v && /^[\w-]{11}$/.test(v)) return v;

      const embed = parsed.pathname.match(/\/embed\/([\w-]{11})/);
      if (embed?.[1]) return embed[1];

      const shorts = parsed.pathname.match(/\/shorts\/([\w-]{11})/);
      if (shorts?.[1]) return shorts[1];
    }
  } catch {
    return null;
  }

  return null;
}

export function youtubeEmbedUrl(url: string): string | null {
  const id = parseYoutubeVideoId(url);
  if (!id) return null;
  return `https://www.youtube-nocookie.com/embed/${id}`;
}

export function youtubeThumbnailUrl(
  videoId: string,
  quality: "maxresdefault" | "hqdefault" = "maxresdefault",
): string {
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

/**
 * Resolves the best available YouTube thumbnail for a video url/id.
 * Not every video has a maxres thumbnail — YouTube serves a 120x90 grey
 * placeholder for those instead of a 404, so we probe the real image size
 * client-side and fall back to hqdefault (always present) when it's missing.
 */
export function resolveYoutubeThumbnail(videoId: string): Promise<string> {
  return new Promise((resolve) => {
    const probe = new Image();
    probe.onload = () => {
      const isPlaceholder = probe.naturalWidth <= 120 && probe.naturalHeight <= 90;
      resolve(youtubeThumbnailUrl(videoId, isPlaceholder ? "hqdefault" : "maxresdefault"));
    };
    probe.onerror = () => resolve(youtubeThumbnailUrl(videoId, "hqdefault"));
    probe.src = youtubeThumbnailUrl(videoId, "maxresdefault");
  });
}
