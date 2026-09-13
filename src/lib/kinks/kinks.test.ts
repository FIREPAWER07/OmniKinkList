import { describe, expect, test } from "bun:test";
import { seedLists } from "@/db/seed-data";
import { computeStats, listChoices, pruneAnswers } from "./choices";
import { generateExportHtml } from "./export-html";
import { matchImport, parseExportJson, parseLegacyJson } from "./import";
import { decodeShare, decodeShareInput, encodeShare } from "./share";
import type { Answers, KinkList } from "./types";

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
      items: [
        { id: 1, name: "Kissing", description: "", options: [{ id: 1, label: "Giving" }, { id: 2, label: "Receiving" }] },
        { id: 2, name: "Masturbation", description: "", options: [] },
      ],
    },
    {
      id: 2,
      name: "Toys",
      description: "",
      items: [{ id: 3, name: "Butt plugs", description: "", options: [{ id: 3, label: "Small" }] }],
    },
  ],
};

describe("choices", () => {
  test("one choice per option, or one per item without options", () => {
    expect(listChoices(list).map((c) => c.key)).toEqual(["o1", "o2", "i2", "o3"]);
  });

  test("stats count only existing choices", () => {
    const answers: Answers = { o1: "like", i2: "favorite", o99: "dislike" };
    const stats = computeStats(listChoices(list), answers);
    expect(stats).toMatchObject({ total: 4, answered: 2, percent: 50 });
    expect(stats.byLevel.like).toBe(1);
    expect(pruneAnswers(list, answers)).toEqual({ o1: "like", i2: "favorite" });
  });
});

describe("share links", () => {
  test("round trip", () => {
    const answers: Answers = { o1: "favorite", o2: "dislike", i2: "maybe", o3: "maybe" };
    const decoded = decodeShare(encodeShare("omni", answers));
    expect(decoded).toEqual({ slug: "omni", answers });
  });

  test("accepts full urls and rejects garbage", () => {
    const payload = encodeShare("common", { o1: "like" });
    expect(decodeShareInput(`https://example.com/s#${payload}`)?.answers).toEqual({ o1: "like" });
    expect(decodeShare("not-a-real-payload")).toBeNull();
    expect(decodeShare("")).toBeNull();
  });
});

describe("export and import", () => {
  test("export embeds safe JSON that imports back", () => {
    const evil: KinkList = structuredClone(list);
    evil.categories[0].items[1].name = "</script><img src=x onerror=alert(1)>";
    const html = generateExportHtml(evil, { o1: "like", i2: "favorite" }, "https://example.com");
    expect(html).not.toContain("<img src=x");
    const json = html.match(/<script type="application\/json" id="okl-export">(.*?)<\/script>/s)?.[1];
    expect(json).toBeDefined();
    const source = parseExportJson(JSON.parse(json!));
    expect(source?.listSlug).toBe("test");
    expect(matchImport(evil, source!).answers).toEqual({ o1: "like", i2: "favorite" });
  });

  test("v2 export falls back to names when ids changed", () => {
    const html = generateExportHtml(list, { o2: "maybe" }, "https://example.com");
    const source = parseExportJson(JSON.parse(html.match(/id="okl-export">(.*?)<\/script>/s)![1]))!;
    const renumbered: KinkList = structuredClone(list);
    renumbered.categories[0].items[0].options = [{ id: 50, label: "Giving" }, { id: 51, label: "Receiving" }];
    expect(matchImport(renumbered, source).answers).toEqual({ o51: "maybe" });
  });

  test("v1 localStorage json maps names to ids", () => {
    const source = parseLegacyJson(
      JSON.stringify({
        Kissing_Receiving: { choiceId: "Kissing_Receiving", level: "favorite" },
        Masturbation: { choiceId: "Masturbation", level: "limit" },
        "Removed thing_Option": { level: "like" },
        "Butt plugs_Small": { level: "not-entered" },
      }),
    );
    expect(source?.kind).toBe("v1-json");
    const result = matchImport(list, source!);
    expect(result.answers).toEqual({ o2: "favorite", i2: "dislike" });
    expect(result.unmatched.map((e) => e.itemName)).toEqual(["Removed thing"]);
  });
});

describe("seed data", () => {
  test("every list has unique category names and option labels per item", () => {
    for (const seed of seedLists) {
      const names = seed.categories.map((c) => c.name);
      expect(new Set(names).size).toBe(names.length);
      for (const item of seed.categories.flatMap((c) => c.items)) {
        const labels = item.options ?? [];
        expect(new Set(labels).size).toBe(labels.length);
      }
    }
  });
});
