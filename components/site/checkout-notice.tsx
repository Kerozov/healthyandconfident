"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, X } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

const COPY = {
  bg: {
    successTitle: "Благодарим ти!",
    successBody:
      "Поръчката е приета. При успешно плащане ще получиш потвърждение на имейла си. Ако ползваш банков превод, потвърждението идва след като банката обработи плащането.",
    cancelTitle: "Плащането е прекъснато",
    cancelBody: "Нямаше зареждане. Можеш да опиташ отново когато си готова.",
    close: "Затвори",
  },
  en: {
    successTitle: "Thank you!",
    successBody:
      "Your order was received. You’ll get an email confirmation once payment clears. If you used a bank transfer, confirmation arrives after the bank processes it.",
    cancelTitle: "Payment cancelled",
    cancelBody: "Nothing was charged. You can try again whenever you’re ready.",
    close: "Close",
  },
} as const;

export function CheckoutNotice({ locale }: { locale: Locale }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<"success" | "cancelled" | null>(null);
  const copy = COPY[locale] ?? COPY.bg;

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "success" || checkout === "cancelled") {
      setStatus(checkout);
    } else {
      setStatus(null);
    }
  }, [searchParams]);

  function dismiss() {
    setStatus(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("checkout");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  if (!status) return null;

  const isSuccess = status === "success";

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-notice-title"
      onClick={dismiss}
    >
      <div
        className={cn(
          "relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1",
          isSuccess ? "ring-forest-200" : "ring-ink/10",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-3 top-3 rounded-full p-1.5 text-ink-soft hover:bg-ink/5"
          aria-label={copy.close}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center text-center">
          {isSuccess ? (
            <CheckCircle2 className="h-12 w-12 text-forest-500" strokeWidth={1.75} />
          ) : (
            <XCircle className="h-12 w-12 text-ink-soft" strokeWidth={1.75} />
          )}
          <h2
            id="checkout-notice-title"
            className="mt-4 font-display text-xl font-semibold text-slate-800"
          >
            {isSuccess ? copy.successTitle : copy.cancelTitle}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            {isSuccess ? copy.successBody : copy.cancelBody}
          </p>
          <button
            type="button"
            onClick={dismiss}
            className={cn(
              "mt-6 inline-flex h-11 w-full items-center justify-center rounded-full px-6 text-sm font-semibold text-white",
              isSuccess ? "bg-forest-600 hover:bg-forest-700" : "bg-slate-700 hover:bg-slate-800",
            )}
          >
            {copy.close}
          </button>
        </div>
      </div>
    </div>
  );
}
