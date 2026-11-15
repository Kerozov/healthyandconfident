import assert from "node:assert/strict";
import {
  allocateBundleAmounts,
  bundleFinalAmount,
  discountedAmount,
  euroToCents,
  parseBlackFridayItemKey,
  programKeysFromMetadata,
  savedPercent,
} from "../lib/black-friday/pricing";

let failures = 0;
let passed = 0;
function test(name: string, run: () => void) {
  try {
    run();
    passed += 1;
  } catch (err) {
    failures += 1;
    console.error(`✗ ${name}\n  ${err instanceof Error ? err.message : err}`);
  }
}
function describe(group: string, run: () => void) {
  const before = failures;
  run();
  if (failures === before) console.log(`✓ ${group}`);
}
function expect<T>(actual: T) {
  return {
    toBe: (expected: T) => assert.equal(actual, expected),
    toEqual: (expected: unknown) => assert.deepEqual(actual, expected),
    toBeNull: () => assert.equal(actual, null),
    toThrow: () => assert.throws(actual as () => unknown),
  };
}

describe("discountedAmount", () => {
  test("percent off rounds to the cent", () => {
    expect(discountedAmount(4900, "percent", 30)).toBe(3430);
    expect(discountedAmount(1999, "percent", 33)).toBe(1339);
  });

  test("euro off and final price", () => {
    expect(discountedAmount(1600, "amount", 7)).toBe(900);
    expect(discountedAmount(1600, "price", 9)).toBe(900);
    expect(discountedAmount(1600, "price", 9.5)).toBe(950);
  });

  test("no real discount gives null", () => {
    expect(discountedAmount(1600, "price", 16)).toBeNull();
    expect(discountedAmount(1600, "price", 20)).toBeNull();
    expect(discountedAmount(1600, "amount", 16)).toBeNull();
    expect(discountedAmount(1600, "percent", 100)).toBeNull();
    expect(discountedAmount(1600, "percent", 0)).toBeNull();
    expect(discountedAmount(0, "percent", 10)).toBeNull();
    expect(discountedAmount(1600, "price", 9.999)).toBeNull();
  });
});

describe("bundles", () => {
  test("final amount must be below the sum and cover a cent per item", () => {
    expect(bundleFinalAmount(7700, 3, "price", 39)).toBe(3900);
    expect(bundleFinalAmount(7700, 3, "percent", 50)).toBe(3850);
    expect(bundleFinalAmount(7700, 3, "price", 77)).toBeNull();
    expect(bundleFinalAmount(10, 3, "price", 0.02)).toBeNull();
  });

  test("allocation sums exactly and keeps every line at least a cent", () => {
    const cases: [number[], number][] = [
      [[4900, 1400, 1400], 3900],
      [[999, 1, 1], 3],
      [[3333, 3333, 3334], 5000],
      [[18000, 4900], 12345],
    ];
    for (const [amounts, total] of cases) {
      const shares = allocateBundleAmounts(amounts, total);
      expect(shares.reduce((sum, value) => sum + value, 0)).toBe(total);
      expect(shares.every((value) => Number.isInteger(value) && value >= 1)).toBe(true);
    }
    expect(allocateBundleAmounts([4900, 1400, 1400], 3900)).toEqual([2482, 709, 709]);
  });

  test("rejects impossible totals", () => {
    expect(() => allocateBundleAmounts([100, 100], 1)).toThrow();
    expect(() => allocateBundleAmounts([100, 100], 300)).toThrow();
  });
});

describe("item keys", () => {
  test("parses the three kinds", () => {
    expect(parseBlackFridayItemKey("product:8c1f2a10-0000-4000-8000-000000000000")).toEqual({
      kind: "product",
      ref: "8c1f2a10-0000-4000-8000-000000000000",
    });
    expect(parseBlackFridayItemKey("program:programs_1_pricing_1")?.kind).toBe("program");
    expect(parseBlackFridayItemKey("guide:abc")?.kind).toBe("guide");
    expect(parseBlackFridayItemKey("price:price_1")).toBeNull();
    expect(parseBlackFridayItemKey("program:a,b")).toBeNull();
  });

  test("programme buttons from metadata", () => {
    expect(
      programKeysFromMetadata("product:x,program:programs_1_pricing_1,guide:y,program:product_kuhnya-bez-rezistentnost_pricing_0"),
    ).toEqual(["programs_1_pricing_1", "product_kuhnya-bez-rezistentnost_pricing_0"]);
    expect(programKeysFromMetadata(undefined)).toEqual([]);
  });
});

test("helpers", () => {
  expect(euroToCents(9.5)).toBe(950);
  expect(euroToCents(0)).toBeNull();
  expect(savedPercent(7700, 3900)).toBe(49);
});

console.log(`${passed} passed, ${failures} failed`);
if (failures > 0) process.exit(1);
