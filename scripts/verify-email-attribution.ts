import {
  buildPurchaseIndex,
  purchaseAfterEmail,
} from "@/lib/admin/email-attribution";

let failures = 0;
function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) {
    console.log(`  ok   ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${name}`, extra ?? "");
  }
}

const index = buildPurchaseIndex([
  { email: "Ana@Example.com", purchasedAt: "2026-10-05T10:00:00Z" },
  { email: "ana@example.com", purchasedAt: "2026-09-01T10:00:00Z" },
  { email: "bob@example.com", purchasedAt: "2026-10-01T09:00:00Z" },
]);

check(
  "покупка 4 дни след имейла се брои",
  purchaseAfterEmail(index, "ana@example.com", "2026-10-01T10:00:00Z") ===
    "2026-10-05T10:00:00.000Z",
);
check(
  "покупка 8 дни след имейла не се брои",
  purchaseAfterEmail(index, "ana@example.com", "2026-09-27T09:00:00Z") === null,
);
check(
  "покупка преди имейла не се брои",
  purchaseAfterEmail(index, "bob@example.com", "2026-10-01T10:00:00Z") === null,
);
check(
  "главни букви в имейла не пречат",
  purchaseAfterEmail(index, "ANA@example.com", "2026-08-30T10:00:00Z") ===
    "2026-09-01T10:00:00.000Z",
);
check(
  "човек без покупки",
  purchaseAfterEmail(index, "nobody@example.com", "2026-10-01T10:00:00Z") === null,
);

if (failures > 0) {
  console.log(`\n${failures} failed`);
  process.exit(1);
}
console.log("\nall good");
