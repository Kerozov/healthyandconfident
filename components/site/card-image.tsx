import { SiteImage } from "@/components/site/site-image";
import { cn } from "@/lib/utils";

/**
 * Admin-uploaded image in a fixed-ratio frame that never crops. The whole
 * picture is shown; whatever the frame has left over is filled with a blurred
 * copy of the same image, so a portrait flyer in a landscape card still looks
 * intentional. Pass the frame's ratio as `className` (e.g. `aspect-[16/10]`).
 */
export function CardImage({
  src,
  alt,
  className,
  imageClassName,
  sizes = "(max-width: 1024px) 100vw, 33vw",
}: {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  sizes?: string;
}) {
  // Uploads live in Supabase Storage; files in /public go through next/image.
  const remote = !src.startsWith("/");

  return (
    <div className={cn("relative overflow-hidden bg-cream-2", className)}>
      {remote ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            aria-hidden
            loading="lazy"
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            loading="lazy"
            className={cn("relative h-full w-full object-contain", imageClassName)}
          />
        </>
      ) : (
        <>
          <SiteImage
            src={src}
            alt=""
            fill
            sizes={sizes}
            imageClassName="scale-110 object-cover opacity-60 blur-2xl"
          />
          <SiteImage
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            imageClassName={cn("object-contain", imageClassName)}
          />
        </>
      )}
    </div>
  );
}
