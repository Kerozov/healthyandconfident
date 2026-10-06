import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRow({ rating, className }: { rating: number; className?: string }) {
  return (
    <span
      role="img"
      aria-label={`${rating} / 5`}
      className={cn("inline-flex gap-0.5", className)}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          aria-hidden
          className={
            i < rating
              ? "h-4 w-4 fill-gold-500 text-gold-500"
              : "h-4 w-4 fill-forest-100 text-forest-100"
          }
        />
      ))}
    </span>
  );
}
