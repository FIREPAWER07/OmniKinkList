import { describe, expect, test } from "bun:test";
import { en } from "@/i18n/messages/en";
import { de } from "@/i18n/messages/de";
import { es } from "@/i18n/messages/es";
import { fr } from "@/i18n/messages/fr";
import { it } from "@/i18n/messages/it";
import { createTranslator } from "@/i18n/translator";
import { localePath, stripLocale } from "@/i18n/config";
import { seedLists } from "@/db/seed-data";
import { buildSeedRows } from "@/db/seed";
import { allChoices, computeStats, listChoices, pruneAnswers, withCustom } from "./choices";
import { compareAnswers } from "./compare";
import { generateExportHtml, type ExportLabels } from "./export-html";
import { entriesFromV1Preferences, matchImport, parseExportJson, parseV1Handoff } from "./import";
import { emptyListData, sanitizeListData } from "./list-data";
import { diffLists, localizeList, sameContent, stampAddedDates, type PublishedData } from "./published";
import { decodeShare, decodeShareInput, encodeShare } from "./share";
import { LEVELS, type KinkList, type ListData } from "./types";

const list: KinkList = {
  slug: "test",
  name: "Test",
  tagline: "",
  description: "",
  categories: [
    {
      id: 1,
      name: "General",
      description: "",
      icon: "sparkle",
      items: [
        {
          id: 1,
          name: "Oral sex",
          description: "",
          options: [
            { id: 1, label: "Giving", kind: "role" },
            { id: 2, label: "Receiving", kind: "role" },
            { id: 3, label: "Slow", kind: "variant" },
          ],
        },
        { id: 2, name: "Masturbation", description: "", options: [] },
      ],
    },
  ],
};

function data(partial: Partial<ListData>): ListData {
  return { ...emptyListData(), updatedAt: 1, ...partial };
}

const labels: ExportLabels = {
  lang: "en",
  title: "t",
  heading: "h",
  summary: "{answered} of {total}",
  exported: "{date}",
  toggleTheme: "theme",
  footer: "footer",
  yourItems: "Yours",
  note: "Note",
  levels: Object.fromEntries(LEVELS.map((l) => [l, l])) as ExportLabels["levels"],
  experience: { tried: "tried", want: "want" },
};

describe("choices and stats", () => {
  test("options and single items become choices, custom items use c keys", () => {
    const categories = withCustom(list, [{ id: 7, name: "Mine", description: "", options: [{ id: 1, label: "A", kind: "variant" }] }], "Yours");
    expect(allChoices(categories).map((c) => c.key)).toEqual(["o1", "o2", "o3", "i2", "c7.1"]);
  });

  test("stats and pruning ignore unknown keys", () => {
    const answers = { o1: "like", i2: "limit", o99: "dislike" } as const;
    const stats = computeStats(listChoices(list), answers);
    expect(stats).toMatchObject({ total: 4, answered: 2, percent: 50 });
    expect(stats.byLevel.limit).toBe(1);
    expect(pruneAnswers(list, answers)).toEqual({ o1: "like", i2: "limit" });
  });

  test("sanitize drops invalid levels, keys, and custom items", () => {
    const clean = sanitizeListData({
      answers: { o1: "like", o2: "nope", "bad key": "like" },
      experience: { o1: "tried", o2: "sometimes" },
      notes: { i1: "hello", o1: "not an item key" },
      custom: [{ id: 1, name: "Ok", options: [{ id: 1, label: "x", kind: "role" }] }, { id: -1, name: "bad" }],
    });
    expect(clean.answers).toEqual({ o1: "like" });
    expect(clean.experience).toEqual({ o1: "tried" });
    expect(clean.notes).toEqual({ i1: "hello" });
    expect(clean.custom).toHaveLength(1);
  });
});

describe("share links", () => {
  test("round trip with experience, notes, custom items, and name", () => {
    const original = data({
      answers: { o1: "favorite", i2: "limit", "c1.1": "maybe" },
      experience: { o1: "tried", o2: "want" },
      notes: { i1: "careful" },
      custom: [{ id: 1, name: "Mine", description: "d", options: [{ id: 1, label: "Role", kind: "role" }] }],
    });
    const decoded = decodeShare(encodeShare("omni", original, { includeNotes: true, name: "Sam" }))!;
    expect(decoded.slug).toBe("omni");
    expect(decoded.name).toBe("Sam");
    expect(decoded.data.answers).toEqual(original.answers);
    expect(decoded.data.experience).toEqual(original.experience);
    expect(decoded.data.notes).toEqual(original.notes);
    expect(decoded.data.custom).toEqual(original.custom);
  });

  test("notes are left out unless asked for, and garbage is rejected", () => {
    const payload = encodeShare("common", data({ answers: { o1: "like" }, notes: { i1: "secret" } }));
    expect(decodeShareInput(`https://example.com/it/s#${payload}`)?.data.notes).toEqual({});
    expect(decodeShare("not-a-real-payload")).toBeNull();
    expect(decodeShare("")).toBeNull();
  });
});

describe("export and import", () => {
  test("export embeds safe JSON that imports back by id", () => {
    const evil: KinkList = structuredClone(list);
    evil.categories[0].items[1].name = "</script><img src=x onerror=alert(1)>";
    const original = data({ answers: { o1: "like", i2: "favorite" }, experience: { o1: "want" }, notes: { i2: "<b>hi</b>" } });
    const html = generateExportHtml(evil, original, "https://example.com", labels);
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<b>hi</b>");
    const json = html.match(/<script type="application\/json" id="okl-export">(.*?)<\/script>/s)?.[1];
    const source = parseExportJson(JSON.parse(json!))!;
    const result = matchImport(evil, source);
    expect(result.data.answers).toEqual({ o1: "like", i2: "favorite" });
    expect(result.data.experience).toEqual({ o1: "want" });
    expect(result.data.notes).toEqual({ i2: "<b>hi</b>" });
  });

  test("falls back to names when ids changed", () => {
    const html = generateExportHtml(list, data({ answers: { o2: "maybe" }, notes: { i1: "note" } }), "https://example.com", labels);
    const source = parseExportJson(JSON.parse(html.match(/id="okl-export">(.*?)<\/script>/s)![1]))!;
    const renumbered: KinkList = structuredClone(list);
    renumbered.categories[0].items[0] = { ...renumbered.categories[0].items[0], id: 50, options: [{ id: 51, label: "Giving", kind: "role" }, { id: 52, label: "Receiving", kind: "role" }] };
    const result = matchImport(renumbered, source);
    expect(result.data.answers).toEqual({ o52: "maybe" });
    expect(result.data.notes).toEqual({ i50: "note" });
  });

  test("v1 browser data maps names to ids, and limit stays a hard limit", () => {
    const entries = entriesFromV1Preferences({
      "Oral sex_Receiving": { choiceId: "Oral sex_Receiving", level: "favorite" },
      Masturbation: { level: "limit" },
      "Removed thing_Option": { level: "like" },
      "Oral sex_Giving": { level: "not-entered" },
    });
    const result = matchImport(list, { kind: "v1-data", listSlug: null, exportedAt: null, data: emptyListData(), entries, noteNames: {} });
    expect(result.data.answers).toEqual({ o2: "favorite", i2: "limit" });
    expect(result.unmatched.map((e) => e.itemName)).toEqual(["Removed thing"]);
  });

  test("the old site's redirect hands answers over in the URL hash", () => {
    // Same encoding as the redirect script on the old GitHub Pages site.
    const payload = JSON.stringify({ type: "test", prefs: { "Oral sex_Receiving": { level: "like" }, "Kïssing": { level: "maybe" } } });
    const binary = String.fromCharCode(...new TextEncoder().encode(payload));
    const encoded = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
    const source = parseV1Handoff(`#v1=${encoded}`);
    expect(source?.listSlug).toBe("test");
    expect(source?.entries.map((e) => e.itemName)).toEqual(["Oral sex", "Kïssing"]);
    expect(matchImport(list, source!).data.answers).toEqual({ o2: "like" });
    expect(parseV1Handoff("#v1=%%%")).toBeNull();
    expect(parseV1Handoff("#nothing")).toBeNull();
  });
});

describe("compare", () => {
  test("complementary roles match, opposite answers conflict", () => {
    const a = data({ answers: { o1: "favorite", i2: "like" } });
    const b = data({ answers: { o2: "like", i2: "limit" } });
    const result = compareAnswers(list, a, b);
    const oral = result.find((r) => r.item.id === 1)!;
    expect(oral.bucket).toBe("match");
    expect(oral.rolePairs).toContainEqual(["Giving", "Receiving"]);
    expect(result.find((r) => r.item.id === 2)!.bucket).toBe("conflict");
  });

  test("shared curiosity is its own bucket", () => {
    const result = compareAnswers(list, data({ experience: { o3: "want" } }), data({ experience: { o3: "want" } }));
    expect(result[0].bucket).toBe("curious");
  });
});

describe("published versions", () => {
  const base: PublishedData = { ...structuredClone(list), translations: { it: { "i:1": { name: "Sesso orale" } } } };

  test("localize falls back to English", () => {
    const localized = localizeList(base, "it");
    expect(localized.categories[0].items[0].name).toBe("Sesso orale");
    expect(localized.categories[0].items[1].name).toBe("Masturbation");
    expect(localizeList(base, "en").categories[0].items[0].name).toBe("Oral sex");
  });

  test("diff and added dates", () => {
    const next: PublishedData = structuredClone(base);
    next.categories[0].items.push({ id: 3, name: "Kissing", description: "", options: [] });
    next.categories[0].items[1].name = "Solo";
    next.translations.it["i:1"].name = "Orale";
    const changes = diffLists(base, next);
    expect(changes.addedItems.map((i) => i.name)).toEqual(["Kissing"]);
    expect(changes.renamedItems).toEqual([{ id: 2, name: "Solo", from: "Masturbation" }]);
    expect(changes.translatedLocales).toEqual(["it"]);

    const prev = structuredClone(base);
    stampAddedDates(null, prev, "2026-01-01T00:00:00.000Z");
    stampAddedDates(prev, next, "2026-02-01T00:00:00.000Z");
    expect(next.categories[0].items[0].addedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(next.categories[0].items[2].addedAt).toBe("2026-02-01T00:00:00.000Z");
    expect(sameContent(prev, { ...structuredClone(prev), version: 9 })).toBe(true);
  });
});

describe("seed data", () => {
  test("unique names per list, unique option labels per item, stable ids", () => {
    for (const seed of seedLists) {
      const names = seed.categories.map((c) => c.name);
      expect(new Set(names).size).toBe(names.length);
      for (const item of seed.categories.flatMap((c) => c.items)) {
        const labelsInItem = [...(item.roles ?? []), ...(item.variants ?? [])].map((l) => l.toLowerCase());
        expect(new Set(labelsInItem).size).toBe(labelsInItem.length);
      }
    }
    const first = buildSeedRows(seedLists);
    const second = buildSeedRows(seedLists);
    expect(first.optionRows.map((o) => o.id)).toEqual(second.optionRows.map((o) => o.id));
    expect(new Set(first.optionRows.map((o) => o.id)).size).toBe(first.optionRows.length);
  });
});

describe("i18n", () => {
  const leafPaths = (value: unknown, prefix = ""): string[] =>
    value && typeof value === "object" && !("other" in (value as object))
      ? Object.entries(value as Record<string, unknown>).flatMap(([k, v]) => leafPaths(v, prefix ? `${prefix}.${k}` : k))
      : [prefix];

  test("every language has exactly the English keys", () => {
    const keys = leafPaths(en).sort();
    for (const messages of [it, es, de, fr]) expect(leafPaths(messages).sort()).toEqual(keys);
  });

  test("every language keeps the same placeholders", () => {
    const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort().join();
    const get = (messages: unknown, path: string) => path.split(".").reduce<unknown>((node, k) => (node as Record<string, unknown>)[k], messages);
    for (const path of leafPaths(en)) {
      const source = get(en, path);
      for (const messages of [it, es, de, fr]) {
        const target = get(messages, path);
        const flat = (v: unknown) => (typeof v === "string" ? v : Object.values(v as object).join(" "));
        expect(placeholders(flat(target)), `${path}`).toBe(placeholders(flat(source)));
      }
    }
  });

  test("plurals and params", () => {
    const t = createTranslator("en", en);
    expect(t("home.newCount", { count: 1 })).toBe("1 new");
    expect(t("rating.progress", { answered: 3, total: 1200 })).toBe("3 of 1,200 answered");
  });

  test("locale paths", () => {
    expect(localePath("en", "/import")).toBe("/import");
    expect(localePath("it", "/")).toBe("/it");
    expect(stripLocale("/de/list/omni")).toEqual({ locale: "de", path: "/list/omni" });
    expect(stripLocale("/list/omni")).toEqual({ locale: "en", path: "/list/omni" });
  });
});
