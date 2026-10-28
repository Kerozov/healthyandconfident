"use client";

import { createContext, useContext, type ReactNode } from "react";
import { normalizeThankYouButton, type ThankYouButton } from "@/lib/site/thank-you-button";

const SignupThankYouContext = createContext<ThankYouButton | null>(null);

export function SignupThankYouProvider({
  button,
  children,
}: {
  button?: ThankYouButton | null;
  children: ReactNode;
}) {
  return (
    <SignupThankYouContext.Provider value={normalizeThankYouButton(button)}>
      {children}
    </SignupThankYouContext.Provider>
  );
}

export function useSignupThankYouButton() {
  return useContext(SignupThankYouContext);
}
