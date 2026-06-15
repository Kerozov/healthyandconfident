import { redirect } from "next/navigation";

/** Fallback if proxy/redirects are skipped — send `/` to the default locale. */
export default function RootPage() {
  redirect("/bg");
}
