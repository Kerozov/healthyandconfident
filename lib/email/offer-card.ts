function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderEmailOfferCard(input: {
  title: string;
  description: string;
  price: string;
  imageUrl: string | null | undefined;
  href: string;
  cta: string;
}): string {
  const title = escapeHtml(input.title);
  const href = escapeHtml(input.href);
  const cta = escapeHtml(input.cta);
  const image = input.imageUrl?.trim() ?? "";
  const price = input.price.trim();
  const description = input.description.trim();

  const imageRow = image
    ? `<tr>
  <td style="padding:0;line-height:0">
    <img src="${escapeHtml(image)}" alt="${title}" width="544" style="display:block;width:100%;max-height:220px;object-fit:cover;border:0" />
  </td>
</tr>`
    : "";

  const priceRow = price
    ? `<p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:600;color:#2D7A47;line-height:1.2">${escapeHtml(price)}</p>`
    : "";

  const descriptionBlock = description
    ? `<p style="margin:12px 0 0;font-size:15px;line-height:1.55;color:#5A7A5A">${escapeHtml(description)}</p>`
    : "";

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;border:1px solid rgba(45,122,71,0.15);border-radius:14px;overflow:hidden;background-color:#FFFFFF">
${imageRow}
<tr>
  <td style="padding:20px 22px">
    ${priceRow}
    <h2 style="margin:${price ? "8px" : "0"} 0 0;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:600;color:#1A2E1A;line-height:1.3">${title}</h2>
    ${descriptionBlock}
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:18px">
      <tr>
        <td style="border-radius:10px;background-color:#F0B429">
          <a href="${href}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 26px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#1A2E1A;text-decoration:none">${cta}</a>
        </td>
      </tr>
    </table>
  </td>
</tr>
</table>`;
}
