import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { DynamicForm } from "@/components/site/dynamic-form";
import { ThankYouButton } from "@/components/site/thank-you-button";
import { FORM_PRESETS } from "@/lib/forms/presets";
import { normalizeThankYouButton, thankYouButtonError } from "@/lib/site/thank-you-button";

const buttons = {
  bg: { label: "Виж програмите", href: "/bg/programs" },
  en: { label: "Join the community", href: "https://example.com/community?from=signup&lang=en" },
};

for (const preset of FORM_PRESETS) {
  for (const locale of ["bg", "en"] as const) {
    const settings = JSON.parse(JSON.stringify({
      ...preset.settings,
      thank_you_button_bg: buttons.bg,
      thank_you_button_en: buttons.en,
    }));
    const html = renderToStaticMarkup(
      <DynamicForm
        locale={locale} title={preset.title_bg} description="" fields={preset.fields}
        settings={settings} slug={preset.slug} preview previewThankYou
      />,
    );
    assert.ok(html.includes(buttons[locale].label), `${preset.key}/${locale}: configured label`);
    assert.ok(html.includes(buttons[locale].href.replaceAll("&", "&amp;")), `${preset.key}/${locale}: configured destination`);
    assert.ok(!html.includes(buttons[locale === "bg" ? "en" : "bg"].label), "Locales remain independent");
    assert.equal(html.includes('target="_blank"'), locale === "en", "External links follow the site's new-tab behavior");

    const legacy = renderToStaticMarkup(
      <DynamicForm
        locale={locale} title={preset.title_bg} description="" fields={preset.fields}
        settings={preset.settings} slug={preset.slug} preview previewThankYou
      />,
    );
    assert.ok(!legacy.includes("<a "), `${preset.key}/${locale}: existing forms need no button`);
  }
}

for (const href of ["javascript:alert(1)", "data:text/html,hello", "//example.com", "/\\example.com", "https://", "https://exa\nmple.com"]) {
  assert.equal(normalizeThankYouButton({ label: "Continue", href }), null);
  assert.ok(thankYouButtonError({ label: "Continue", href }));
  assert.equal(renderToStaticMarkup(<ThankYouButton button={{ label: "Continue", href }} />), "");
}
for (const href of ["/en/programs#join", "#next", "mailto:hello@example.com", "tel:+359888123456", "https://example.com/next"]) {
  assert.deepEqual(normalizeThankYouButton({ label: " Continue ", href: ` ${href} ` }), { label: "Continue", href });
}
assert.equal(thankYouButtonError({ label: "", href: "" }), null);
assert.ok(thankYouButtonError({ label: "Continue", href: "" }));
assert.ok(thankYouButtonError({ label: "", href: "/bg" }));
assert.equal(renderToStaticMarkup(<ThankYouButton button={null} />), "");
assert.ok(renderToStaticMarkup(<ThankYouButton button={{ label: "<script>alert(1)</script>", href: "/bg" }} />).includes("&lt;script&gt;"));

const publicForm = renderToStaticMarkup(
  <DynamicForm locale="bg" title="Форма" description="" fields={[]}
    settings={{ theme: "default", thank_you_bg: "Готово", thank_you_en: "Done", thank_you_button_bg: buttons.bg }}
    slug="example" previewThankYou />,
);
assert.ok(publicForm.includes("<form"), "Direct thank-you preview is confined to admin previews");
assert.ok(!publicForm.includes(buttons.bg.label));
console.log(`Thank-you buttons verified across ${FORM_PRESETS.length} form presets, both locales, and safe/empty link settings.`);
