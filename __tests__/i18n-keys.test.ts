import en from "@/locales/en.json";
import fr from "@/locales/fr.json";

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
interface JsonObject {
  [key: string]: JsonValue;
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectLeafKeys(
  obj: JsonObject,
  prefix = "",
  out: Map<string, string> = new Map(),
): Map<string, string> {
  for (const [k, v] of Object.entries(obj)) {
    const keyPath = prefix ? `${prefix}.${k}` : k;

    if (typeof v === "string") {
      out.set(keyPath, v);
      continue;
    }

    if (isObject(v)) {
      collectLeafKeys(v, keyPath, out);
      continue;
    }

    // We don't expect arrays/numbers/etc. in our translation JSON.
    // If we get them, treat it like a leaf so we catch it.
    out.set(keyPath, String(v));
  }

  return out;
}

describe("i18n locale parity", () => {
  test("en.json and fr.json have identical keys", () => {
    const enKeys = collectLeafKeys(en as unknown as JsonObject);
    const frKeys = collectLeafKeys(fr as unknown as JsonObject);

    const missingInFr = [...enKeys.keys()].filter((k) => !frKeys.has(k)).sort();
    const missingInEn = [...frKeys.keys()].filter((k) => !enKeys.has(k)).sort();

    expect(missingInFr).toEqual([]);
    expect(missingInEn).toEqual([]);
  });

  test("no empty strings in translations", () => {
    const enKeys = collectLeafKeys(en as unknown as JsonObject);
    const frKeys = collectLeafKeys(fr as unknown as JsonObject);

    const emptyEn = [...enKeys.entries()]
      .filter(([, v]) => typeof v === "string" && v.trim() === "")
      .map(([k]) => k)
      .sort();

    const emptyFr = [...frKeys.entries()]
      .filter(([, v]) => typeof v === "string" && v.trim() === "")
      .map(([k]) => k)
      .sort();

    expect(emptyEn).toEqual([]);
    expect(emptyFr).toEqual([]);
  });
});
