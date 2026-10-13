/**
 * Renders the static brand images the site links to:
 *   public/og/default.png  — 1200×630 social-share card (siteConfig.ogImage)
 *   app/icon.png           — 512×512 favicon
 *   app/apple-icon.png     — 180×180 iOS home-screen icon
 *
 * Run on macOS (uses the system Georgia for Cyrillic): bun scripts/generate-brand-images.tsx
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { ImageResponse } from "next/og";

const FONT_DIR = "/System/Library/Fonts/Supplemental";
const colors = {
  cream: "#f9f7f2",
  ink: "#2c3e50",
  inkSoft: "#5d6d7e",
  forest: "#6a7153",
  coral: "#f2784b",
};

async function render(el: React.ReactElement, width: number, height: number, out: string) {
  const [regular, bold] = await Promise.all([
    readFile(`${FONT_DIR}/Georgia.ttf`),
    readFile(`${FONT_DIR}/Georgia Bold.ttf`),
  ]);
  const res = new ImageResponse(el, {
    width,
    height,
    fonts: [
      { name: "Georgia", data: regular, weight: 400, style: "normal" },
      { name: "Georgia", data: bold, weight: 700, style: "normal" },
    ],
  });
  await writeFile(out, Buffer.from(await res.arrayBuffer()));
  console.log("wrote", out);
}

async function main() {
  const photo = await readFile("public/images/3.jpg");
  const photoSrc = `data:image/jpeg;base64,${photo.toString("base64")}`;

  await mkdir("public/og", { recursive: true });
  await render(
    <div style={{ display: "flex", width: "100%", height: "100%", background: colors.cream, fontFamily: "Georgia" }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: 700, padding: "0 64px 0 72px" }}>
        <div style={{ display: "flex", fontSize: 26, letterSpacing: 4, color: colors.forest, textTransform: "uppercase" }}>
          Healthy &amp; Confident
        </div>
        <div style={{ display: "flex", fontSize: 84, fontWeight: 700, color: colors.ink, marginTop: 18, lineHeight: 1.05 }}>
          Веси Ней
        </div>
        <div style={{ display: "flex", width: 96, height: 6, background: colors.coral, borderRadius: 3, marginTop: 30 }} />
        <div style={{ display: "flex", fontSize: 36, color: colors.ink, marginTop: 30, lineHeight: 1.3 }}>
          Холистичен диетолог
        </div>
        <div style={{ display: "flex", fontSize: 28, color: colors.inkSoft, marginTop: 12, lineHeight: 1.35 }}>
          Инсулинова резистентност · Диабет тип 2 · Трайно отслабване
        </div>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photoSrc} alt="" width={500} height={630} style={{ objectFit: "cover", objectPosition: "center 20%" }} />
    </div>,
    1200,
    630,
    "public/og/default.png",
  );

  const monogram = (size: number, radius = size * 0.22) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: colors.forest,
        borderRadius: radius,
        color: colors.cream,
        fontFamily: "Georgia",
        fontWeight: 700,
        fontSize: size * 0.5,
        letterSpacing: -size * 0.01,
      }}
    >
      VN
    </div>
  );
  await render(monogram(512), 512, 512, "app/icon.png");
  await render(monogram(180, 0), 180, 180, "app/apple-icon.png");
}

main();
