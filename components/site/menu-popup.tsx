"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { X, Gift } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { SubscribeForm } from "@/components/site/subscribe-form";
import { useOfferPopup } from "@/components/site/offer-popup";

export type MenuPopupCopy = {
  title: string;
  subtitle: string;
  button: string;
  consent: string;
  success: string;
};

type MenuPopupContextValue = {
  openMenuPopup: (source?: string) => void;
};

const MenuPopupContext = createContext<MenuPopupContextValue | null>(null);

export function useMenuPopup(): MenuPopupContextValue {
  const ctx = useContext(MenuPopupContext);
  if (!ctx) {
    throw new Error("useMenuPopup must be used within MenuPopupProvider");
  }
  return ctx;
}

export function MenuPopupProvider({
  locale,
  copy,
  children,
}: {
  locale: Locale;
  copy: MenuPopupCopy;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState("menu-popup");
  const [done, setDone] = useState(false);
  const { tryOpenPlacement } = useOfferPopup();

  const storageKey = `hc_popup_${locale}`;

  const openMenuPopup = useCallback(
    (nextSource = "menu-popup") => {
      if (
        nextSource === "auto-popup" &&
        typeof window !== "undefined" &&
        localStorage.getItem(storageKey)
      ) {
        return;
      }
      setSource(nextSource);
      setDone(false);
      setOpen(true);
    },
    [storageKey],
  );

  const close = useCallback(
    (rememberDismiss = true) => {
      if (
        rememberDismiss &&
        source === "auto-popup" &&
        typeof window !== "undefined"
      ) {
        localStorage.setItem(storageKey, "dismissed");
      }
      setOpen(false);
      setDone(false);
    },
    [source, storageKey],
  );

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  return (
    <MenuPopupContext.Provider value={{ openMenuPopup }}>
      {children}

      {open && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-forest-900/55 p-3 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="menu-popup-title"
          onClick={() => close()}
        >
          <div
            className="animate-fade-up relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-cream-50 shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => close()}
              aria-label={locale === "bg" ? "Затвори" : "Close"}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-forest-800/5 text-forest-800 transition-colors hover:bg-forest-800/10 sm:right-4 sm:top-4"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="bg-slate-800 px-5 py-5 text-white sm:px-7 sm:py-6">
              <span className="eyebrow text-gold-400">
                <Gift className="h-4 w-4" />
                {locale === "bg" ? "Безплатен подарък" : "Free gift"}
              </span>
              <h2
                id="menu-popup-title"
                className="mt-2 pr-8 font-display text-xl font-semibold leading-tight sm:text-2xl"
              >
                {copy.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{copy.subtitle}</p>
            </div>

            <div className="px-5 py-5 sm:px-7 sm:py-6">
              {done ? (
                <p className="py-6 text-center font-display text-xl text-forest-600">
                  {copy.success}
                </p>
              ) : (
                <SubscribeForm
                  locale={locale}
                  source={source}
                  baseTags={["weight-loss"]}
                  consent={copy.consent}
                  success={copy.success}
                  buttonLabel={copy.button}
                  onSuccess={() => {
                    setDone(true);
                    if (typeof window !== "undefined") {
                      localStorage.setItem(storageKey, "subscribed");
                    }
                    tryOpenPlacement("leadmagnet_cta", "");
                    setTimeout(() => close(false), 2500);
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </MenuPopupContext.Provider>
  );
}
