import { describe, expect, test } from "bun:test";
import { emailBodyLinks } from "../lib/email/body-links";
import { makeEmailButtonMarker } from "../lib/email/body-buttons";

const BF =
  '<p data-hc="text">Само 3 часа до края.</p>\n\n<table data-hc="button" data-label="Виж отстъпките" data-href="https://www.healthyandconfident.co.uk/bg/black-friday" data-variant="green" role="presentation"><tr><td><a href="https://www.healthyandconfident.co.uk/bg/black-friday">Виж отстъпките</a></td></tr></table>';

describe("emailBodyLinks", () => {
  test("reads the block editor button, once", () => {
    expect(emailBodyLinks(BF)).toEqual([
      {
        label: "Виж отстъпките",
        href: "https://www.healthyandconfident.co.uk/bg/black-friday",
        kind: "button",
      },
    ]);
  });

  test("reads the older button marker and unescapes attributes", () => {
    const html = `${makeEmailButtonMarker("Запиши се", "/bg/x?a=1&b=2")}<table data-hc="button" data-label="A &amp; B" data-href="/bg/y?a=1&amp;b=2"></table>`;
    expect(emailBodyLinks(html)).toEqual([
      { label: "A & B", href: "/bg/y?a=1&b=2", kind: "button" },
      { label: "Запиши се", href: "/bg/x?a=1&b=2", kind: "button" },
    ]);
  });

  test("falls back to plain links, skipping mail and merge tags", () => {
    const html =
      '<p>Виж <a href="https://example.com/a"><strong>тук</strong></a>, <a href="mailto:x@y.z">пиши</a> и <a href="{{unsubscribe_url}}">отпиши</a>.</p>';
    expect(emailBodyLinks(html)).toEqual([
      { label: "тук", href: "https://example.com/a", kind: "link" },
    ]);
  });

  test("empty body has nothing", () => {
    expect(emailBodyLinks("")).toEqual([]);
    expect(emailBodyLinks(null)).toEqual([]);
  });
});
