"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { youtubeThumbnailUrl } from "@/lib/youtube";

/**
 * A YouTube video that costs one image until someone presses play. A real
 * embed loads ~1 MB of player script per video, which a page full of proof
 * would pay for up front — and a slow page sells less.
 */
export function LiteYouTube({
  videoId,
  title,
  playLabel,
}: {
  videoId: string;
  title: string;
  playLabel: string;
}) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
        title={title}
        className="absolute inset-0 h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="group absolute inset-0 h-full w-full"
      aria-label={`${playLabel}: ${title}`}
    >
      {/* hqdefault exists for every video; maxres does not. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={youtubeThumbnailUrl(videoId, "hqdefault")}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
      />
      <span className="absolute inset-0 bg-slate-900/25 transition-colors group-hover:bg-slate-900/15" />
      <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-slate-800 shadow-xl transition-transform group-hover:scale-105">
        <Play className="ml-1 h-7 w-7 fill-current" aria-hidden />
      </span>
    </button>
  );
}
