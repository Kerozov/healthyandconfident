/** Minimal root layout for `/` redirect only. Locale pages use `(site)/[locale]/layout`. */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
