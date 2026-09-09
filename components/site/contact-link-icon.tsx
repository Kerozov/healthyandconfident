import {
  Link2,
  Globe,
  Mail,
  Phone,
  MessageCircle,
  Send,
  Calendar,
  MapPin,
  Video,
  type LucideIcon,
} from "lucide-react";
import type { ContactLinkIcon } from "@/lib/site/contact-links";
import { MessengerIcon } from "@/components/site/messenger-widget";

// lucide dropped its brand glyphs, so the three social marks are inline.
function InstagramMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.91h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94z" />
    </svg>
  );
}

function YoutubeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M21.58 7.19a2.5 2.5 0 0 0-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.81.42a2.5 2.5 0 0 0-1.77 1.77A26.1 26.1 0 0 0 2 12a26.1 26.1 0 0 0 .42 4.81 2.5 2.5 0 0 0 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.81-.42a2.5 2.5 0 0 0 1.77-1.77A26.1 26.1 0 0 0 22 12a26.1 26.1 0 0 0-.42-4.81zM10 15.02V8.98L15.2 12 10 15.02z" />
    </svg>
  );
}

const lucideMap: Partial<Record<ContactLinkIcon, LucideIcon>> = {
  link: Link2,
  globe: Globe,
  mail: Mail,
  phone: Phone,
  message: MessageCircle,
  send: Send,
  calendar: Calendar,
  map: MapPin,
  video: Video,
};

export function ContactLinkIconGlyph({
  name,
  className,
}: {
  name: ContactLinkIcon;
  className?: string;
}) {
  if (name === "messenger") return <MessengerIcon className={className} />;
  if (name === "instagram") return <InstagramMark className={className} />;
  if (name === "facebook") return <FacebookMark className={className} />;
  if (name === "youtube") return <YoutubeMark className={className} />;
  const Cmp = lucideMap[name] ?? Link2;
  return <Cmp className={className} />;
}
