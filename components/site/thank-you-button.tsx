import { externalLinkProps } from "@/lib/site/external-link";
import {
  normalizeThankYouButton,
  type ThankYouButton as ThankYouButtonSettings,
} from "@/lib/site/thank-you-button";
import { cn } from "@/lib/utils";

export function ThankYouButton({
  button,
  variant = "default",
  className,
}: {
  button?: ThankYouButtonSettings | null;
  variant?: "default" | "light";
  className?: string;
}) {
  const configured = normalizeThankYouButton(button);
  if (!configured) return null;

  return (
    <a
      href={configured.href}
      {...externalLinkProps(configured.href)}
      className={cn(
        "mt-4 inline-flex min-h-11 max-w-full items-center justify-center rounded-full px-6 py-3 text-center text-sm font-semibold break-words transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500",
        variant === "light"
          ? "bg-white text-forest-800 hover:bg-cream"
          : "bg-forest-600 text-white hover:bg-forest-700",
        className,
      )}
    >
      {configured.label}
    </a>
  );
}
