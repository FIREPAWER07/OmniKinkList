import { categoryChoices, computeStats, listChoices, type ChoiceKey } from "./choices";
import { LEVEL_LABELS, LEVELS, type Answers, type KinkList } from "./types";

export const EXPORT_FORMAT = "omnikinklist-export";
export const EXPORT_VERSION = 2;

export interface ExportPayload {
  format: typeof EXPORT_FORMAT;
  version: number;
  list: { slug: string; name: string };
  exportedAt: string;
  answers: Answers;
  /** `[item name, option label | null]` per key, so imports survive id changes. */
  labels: Record<string, [string, string | null]>;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);

/** JSON that is safe to inline inside a <script> element. */
const inlineJson = (value: unknown) =>
  JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(new RegExp(String.fromCharCode(0x2028), "g"), "\\u2028")
    .replace(new RegExp(String.fromCharCode(0x2029), "g"), "\\u2029");

export function buildExportPayload(list: KinkList, answers: Answers, now = new Date()): ExportPayload {
  const labels: ExportPayload["labels"] = {};
  const kept: Answers = {};
  for (const choice of listChoices(list)) {
    const level = answers[choice.key];
    if (!level) continue;
    kept[choice.key] = level;
    labels[choice.key] = [choice.item.name, choice.optionLabel];
  }
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    list: { slug: list.slug, name: list.name },
    exportedAt: now.toISOString(),
    answers: kept,
    labels,
  };
}

export function exportFileName(list: KinkList, now = new Date()) {
  return `omnikinklist-${list.slug}-${now.toISOString().slice(0, 10)}.html`;
}

export function generateExportHtml(list: KinkList, answers: Answers, siteUrl: string, now = new Date()) {
  const payload = buildExportPayload(list, answers, now);
  const stats = computeStats(listChoices(list), payload.answers);
  const date = now.toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric" });

  const bar = LEVELS.filter((l) => stats.byLevel[l] > 0)
    .map((l) => `<span class="lv-${l}" style="flex:${stats.byLevel[l]}" title="${LEVEL_LABELS[l]}: ${stats.byLevel[l]}"></span>`)
    .join("");

  const statCells = LEVELS.map(
    (l) =>
      `<div class="stat"><span class="dot lv-${l}"></span><b>${stats.byLevel[l]}</b><small>${LEVEL_LABELS[l]}</small></div>`,
  ).join("");

  const sections = list.categories
    .map((category) => {
      const answeredKeys = new Set<ChoiceKey>(
        categoryChoices(category)
          .filter((c) => payload.answers[c.key])
          .map((c) => c.key),
      );
      if (answeredKeys.size === 0) return "";
      const cards = category.items
        .map((item) => {
          const rows =
            item.options.length === 0
              ? answeredKeys.has(`i${item.id}`)
                ? [{ label: null, level: payload.answers[`i${item.id}`] }]
                : []
              : item.options
                  .filter((o) => answeredKeys.has(`o${o.id}`))
                  .map((o) => ({ label: o.label, level: payload.answers[`o${o.id}`] }));
          if (rows.length === 0) return "";
          const chips = rows
            .map(
              (r) =>
                `<li><span>${r.label ? escapeHtml(r.label) : "&nbsp;"}</span><em class="chip lv-${r.level}">${LEVEL_LABELS[r.level]}</em></li>`,
            )
            .join("");
          return `<article><h3>${escapeHtml(item.name)}</h3>${
            item.description ? `<p>${escapeHtml(item.description)}</p>` : ""
          }<ul>${chips}</ul></article>`;
        })
        .join("");
      return `<section><h2>${escapeHtml(category.name)}</h2><div class="grid">${cards}</div></section>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="OmniKinkList">
<meta name="kinklist-version" content="${EXPORT_VERSION}">
<meta name="kinklist-type" content="${escapeHtml(list.slug)}">
<meta name="kinklist-export-date" content="${payload.exportedAt}">
<meta name="robots" content="noindex">
<title>My OmniKinkList · ${escapeHtml(list.name)}</title>
<script type="application/json" id="okl-export">${inlineJson(payload)}</script>
<style>
:root{--bg:#faf7f5;--surface:#fff;--border:#e8e0dc;--fg:#1a1417;--muted:#6b6166;--accent:#d42a66;
--favorite:#e0306f;--like:#12a36a;--indifferent:#6b7489;--maybe:#d98511;--dislike:#d93636;color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#0c0a0d;--surface:#161217;--border:#2a232c;--fg:#f5f0f3;--muted:#a39aa3;--accent:#ff4f8b;
--favorite:#ff4f8b;--like:#3ecf8e;--indifferent:#8d95aa;--maybe:#f5a524;--dislike:#f25555;color-scheme:dark}}
:root[data-theme=dark]{--bg:#0c0a0d;--surface:#161217;--border:#2a232c;--fg:#f5f0f3;--muted:#a39aa3;--accent:#ff4f8b;
--favorite:#ff4f8b;--like:#3ecf8e;--indifferent:#8d95aa;--maybe:#f5a524;--dislike:#f25555;color-scheme:dark}
*{box-sizing:border-box;margin:0}
body{background:var(--bg);color:var(--fg);font:15px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;padding:32px 20px 64px}
main{max-width:1080px;margin:0 auto}
header{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap;padding-bottom:24px;border-bottom:1px solid var(--border)}
.eyebrow{color:var(--accent);font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase}
h1{font-size:clamp(28px,5vw,40px);letter-spacing:-.02em;line-height:1.1;margin-top:6px}
header p{color:var(--muted);margin-top:6px}
button{font:inherit;color:var(--fg);background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:8px 12px;cursor:pointer}
.summary{margin:28px 0 8px}
.bar{display:flex;height:10px;border-radius:99px;overflow:hidden;background:var(--border);gap:2px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-top:16px}
.stat{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px 14px;display:grid;grid-template-columns:auto 1fr;column-gap:8px;align-items:center}
.stat b{font-size:22px;font-variant-numeric:tabular-nums}.stat small{grid-column:1/-1;color:var(--muted)}
.dot{width:10px;height:10px;border-radius:99px}
section{margin-top:40px}
h2{font-size:20px;letter-spacing:-.01em;margin-bottom:14px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
article{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px}
h3{font-size:15px}article p{color:var(--muted);font-size:13px;margin-top:4px}
ul{list-style:none;padding:0;margin-top:12px;display:grid;gap:6px}
li{display:flex;justify-content:space-between;gap:12px;align-items:center;font-size:13px}
.chip{font-style:normal;font-size:12px;font-weight:600;padding:2px 10px;border-radius:99px;color:#fff}
.lv-favorite{background:var(--favorite)}.lv-like{background:var(--like)}.lv-indifferent{background:var(--indifferent)}.lv-maybe{background:var(--maybe)}.lv-dislike{background:var(--dislike)}
footer{margin-top:56px;color:var(--muted);font-size:13px;text-align:center}
a{color:var(--accent)}
</style>
</head>
<body>
<main>
<header>
<div><div class="eyebrow">OmniKinkList · ${escapeHtml(list.name)}</div><h1>My kink list</h1><p>${stats.answered} of ${stats.total} answered · exported ${escapeHtml(date)}</p></div>
<button type="button" onclick="var r=document.documentElement,d=r.dataset.theme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');r.dataset.theme=d==='dark'?'light':'dark'">Toggle theme</button>
</header>
<div class="summary"><div class="bar">${bar}</div><div class="stats">${statCells}</div></div>
${sections}
<footer>Made with <a href="${escapeHtml(siteUrl)}">OmniKinkList</a>. Import this file on the site to keep editing.</footer>
</main>
</body>
</html>`;
}

export function downloadExport(list: KinkList, answers: Answers, siteUrl: string) {
  const html = generateExportHtml(list, answers, siteUrl);
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = exportFileName(list);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
