"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ExternalLink,
  Loader2,
  Monitor,
  RefreshCw,
  Smartphone,
} from "lucide-react";
import {
  CTA_PREVIEW_SOURCE,
  ctaPreviewUrl,
  isCtaPreviewReport,
  type CtaPreviewCommand,
} from "@/lib/site/cta-preview";
import { siteButtonPath, type SiteButtonSpot } from "@/lib/site/button-catalog";
import { cn } from "@/lib/utils";

/** Height of the window onto the page, in admin pixels. */
const PANE = 480;
const DESKTOP_WIDTH = 1280;
const PHONE_WIDTH = 390;

type Device = "desktop" | "phone";
type Report = { count: number; hidden: boolean };

function Chip({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-forest-600 bg-forest-600 text-cream"
          : "border-ink/15 bg-white text-ink-soft hover:border-ink/30 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

/**
 * The real page, framed, with the button being edited lit up and everything
 * else dimmed. A description of where a button sits is guesswork; this is the
 * page itself, so there is nothing left to guess.
 *
 * Clicks inside the frame are swallowed by the page's own preview script, so
 * the preview cannot wander off the button.
 */
export function CtaPreviewFrame({
  ctaKey,
  spots,
  labels,
  reloadToken,
}: {
  ctaKey: string;
  spots: SiteButtonSpot[];
  /**
   * What the button should read while the admin types, per language; `null`
   * means "leave the text the page already renders".
   */
  labels: { bg: string | null; en: string | null };
  /** Bumped after a save so the frame picks the new settings up. */
  reloadToken: number;
}) {
  const [spotIndex, setSpotIndex] = useState(0);
  const [locale, setLocale] = useState<"bg" | "en">("bg");
  const [device, setDevice] = useState<Device>("desktop");
  const [nonce, setNonce] = useState(0);
  const [width, setWidth] = useState(0);
  const paneRef = useRef<HTMLDivElement>(null);

  const spot = spots[Math.min(spotIndex, spots.length - 1)] ?? spots[0];
  const pagePath = siteButtonPath(locale, spot?.path ?? "");
  const src = ctaPreviewUrl(pagePath, ctaKey);

  useEffect(() => {
    const pane = paneRef.current;
    if (!pane) return;
    // The observer reports the starting size too, so nothing is measured here.
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    observer.observe(pane);
    return () => observer.disconnect();
  }, []);

  const frameWidth = device === "desktop" ? DESKTOP_WIDTH : PHONE_WIDTH;
  const scale = width > 0 ? Math.min(1, width / frameWidth) : 0;
  const offset = device === "phone" ? Math.max(0, (width - frameWidth * scale) / 2) : 0;

  return (
    <div className="space-y-3 rounded-xl border border-ink/10 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-forest-700">
          Живо превю
        </span>

        {spots.length > 1 &&
          spots.map((s, i) => (
            <Chip
              key={s.where}
              active={i === spotIndex}
              onClick={() => setSpotIndex(i)}
              title={s.where}
            >
              {s.path === "" ? "Начална страница" : "Страница на програмата"}
            </Chip>
          ))}

        <span className="ml-auto flex items-center gap-2">
          <Chip active={locale === "bg"} onClick={() => setLocale("bg")}>
            BG
          </Chip>
          <Chip active={locale === "en"} onClick={() => setLocale("en")}>
            EN
          </Chip>
          <Chip
            active={device === "desktop"}
            onClick={() => setDevice("desktop")}
            title="Компютър"
          >
            <Monitor className="h-3.5 w-3.5" />
          </Chip>
          <Chip
            active={device === "phone"}
            onClick={() => setDevice("phone")}
            title="Телефон"
          >
            <Smartphone className="h-3.5 w-3.5" />
          </Chip>
          <Chip onClick={() => setNonce((n) => n + 1)} title="Презареди превюто">
            <RefreshCw className="h-3.5 w-3.5" />
          </Chip>
        </span>
      </div>

      <p className="text-xs text-ink-soft">{spot?.where}</p>

      <div
        ref={paneRef}
        className="relative overflow-hidden rounded-lg border border-ink/10 bg-cream-2/40"
        style={{ height: PANE }}
      >
        {scale > 0 && (
          // Remounted for every page, language and reload, so "is it loaded"
          // and "was it found" always describe the frame on screen.
          <PreviewPane
            key={`${src}-${reloadToken}-${nonce}`}
            src={src}
            ctaKey={ctaKey}
            label={labels[locale]}
            frameWidth={frameWidth}
            scale={scale}
            offset={offset}
            pagePath={pagePath}
          />
        )}
      </div>
    </div>
  );
}

function PreviewPane({
  src,
  ctaKey,
  label,
  frameWidth,
  scale,
  offset,
  pagePath,
}: {
  src: string;
  ctaKey: string;
  label: string | null;
  frameWidth: number;
  scale: number;
  offset: number;
  pagePath: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.source !== frameRef.current?.contentWindow) return;
      const msg: unknown = event.data;
      if (!isCtaPreviewReport(msg) || msg.key !== ctaKey) return;
      setReport({ count: msg.count, hidden: msg.hidden });
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [ctaKey]);

  // Retype the button in the framed page while the admin edits the text field.
  useEffect(() => {
    if (!loaded) return;
    const frame = frameRef.current?.contentWindow;
    if (!frame) return;
    const timer = window.setTimeout(() => {
      const command: CtaPreviewCommand = {
        source: CTA_PREVIEW_SOURCE,
        type: "label",
        key: ctaKey,
        label,
      };
      frame.postMessage(command, window.location.origin);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [label, loaded, ctaKey]);

  return (
    <>
      <iframe
        ref={frameRef}
        src={src}
        title={`Превю на бутона на ${pagePath}`}
        onLoad={() => setLoaded(true)}
        // Same origin, so postMessage still works, but the framed page can
        // neither submit forms nor navigate the admin panel away.
        sandbox="allow-same-origin allow-scripts"
        style={{
          width: frameWidth,
          height: PANE / scale,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          border: "none",
          position: "absolute",
          top: 0,
          left: offset,
        }}
      />

      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-cream-2/70 text-sm text-ink-soft">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Зарежда страницата…
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-2 border-t border-ink/10 bg-white/95 px-3 py-2">
        <StatusLine loaded={loaded} report={report} />
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-forest-700 underline underline-offset-2"
        >
          Отвори в нов таб <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </>
  );
}

function StatusLine({ loaded, report }: { loaded: boolean; report: Report | null }) {
  if (!loaded || !report) {
    return <span className="text-xs text-ink-soft">Търси бутона на страницата…</span>;
  }
  if (report.count === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-coral-700">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        Бутонът не се намери на тази страница.
      </span>
    );
  }
  if (report.hidden) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        Изключен за този език — тук е с пунктир, на сайта не се вижда.
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-forest-700">
      <Check className="h-3.5 w-3.5 shrink-0" />
      Осветеният бутон е този, който редактираш
      {report.count > 1 ? ` (${report.count} места)` : ""}.
    </span>
  );
}
