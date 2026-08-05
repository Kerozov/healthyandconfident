import Image from "next/image";
import { cn } from "@/lib/utils";

type SiteImageProps = {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  /** Above-the-fold images — preloads and loads eagerly (Next 16 replaced `priority`). */
  priority?: boolean;
  sizes?: string;
  quality?: number;
} & (
  | { fill: true; width?: never; height?: never }
  | { fill?: false; width: number; height: number }
);

/**
 * fill mode: parent must be `position: relative` with explicit size (aspect-* or h-*).
 * Image is rendered as a direct child so Next.js fill layout works correctly.
 */
export function SiteImage({
  src,
  alt,
  className,
  imageClassName,
  priority,
  sizes,
  quality = 82,
  fill,
  width,
  height,
}: SiteImageProps) {
  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        preload={priority}
        loading={priority ? "eager" : "lazy"}
        quality={quality}
        sizes={sizes ?? "(max-width: 768px) 100vw, 50vw"}
        className={cn("object-cover", imageClassName, className)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      preload={priority}
      loading={priority ? "eager" : "lazy"}
      quality={quality}
      sizes={sizes}
      className={cn("h-auto w-full", className, imageClassName)}
    />
  );
}
