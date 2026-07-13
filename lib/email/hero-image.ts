function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Full-width hero/banner row for the top of branded emails. */
export function renderEmailHeroImage(imageUrl: string | null | undefined): string {
  const src = imageUrl?.trim();
  if (!src) return "";
  const safe = escapeHtml(src);
  return `
<tr>
  <td align="center" style="padding:0;line-height:0;font-size:0;background-color:#ffffff">
    <img src="${safe}" alt="" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;object-fit:contain" />
  </td>
</tr>`;
}

/** Inline image snippet for pasting into email HTML body. */
export function inlineEmailImageHtml(imageUrl: string): string {
  const src = escapeHtml(imageUrl.trim());
  return `<p style="margin:0 0 16px;line-height:0"><img src="${src}" alt="" style="display:block;width:100%;max-width:100%;height:auto;border:0;border-radius:8px" /></p>`;
}
