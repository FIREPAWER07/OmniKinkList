import { allChoices, computeStats, itemChoices, itemKey, withCustom } from "./choices";
import { emptyListData } from "./list-data";
import { LEVELS, type Experience, type KinkList, type Level, type ListData } from "./types";

export const EXPORT_FORMAT = "omnikinklist-export";
export const EXPORT_VERSION = 3;

export interface ExportPayload {
  format: typeof EXPORT_FORMAT;
  version: number;
  list: { slug: string; name: string };
  exportedAt: string;
  data: ListData;
  /** `[item name, option label | null]` per choice key, so imports survive id changes. */
  labels: Record<string, [string, string | null]>;
  /** Item name per item key, for notes. */
  itemNames: Record<string, string>;
}

/** Translated strings used inside the exported file. */
export interface ExportLabels {
  lang: string;
  title: string;
  heading: string;
  /** Contains `{answered}` and `{total}`. */
  summary: string;
  /** Contains `{date}`. */
  exported: string;
  toggleTheme: string;
  footer: string;
  yourItems: string;
  note: string;
  levels: Record<Level, string>;
  experience: Record<Experience, string>;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);

const LINE_SEPARATOR = new RegExp(String.fromCharCode(0x2028), "g");
const PARAGRAPH_SEPARATOR = new RegExp(String.fromCharCode(0x2029), "g");

/** JSON that is safe to inline inside a <script> element. */
const inlineJson = (value: unknown) =>
  JSON.stringify(value).replace(/</g, "\\u003c").replace(LINE_SEPARATOR, "\\u2028").replace(PARAGRAPH_SEPARATOR, "\\u2029");

export function buildExportPayload(list: KinkList, data: ListData, now = new Date()): ExportPayload {
  const categories = withCustom(list, data.custom, "");
  const labels: ExportPayload["labels"] = {};
  const itemNames: ExportPayload["itemNames"] = {};
  const kept = emptyListData();
  kept.custom = data.custom;
  kept.updatedAt = data.updatedAt;
  for (const choice of allChoices(categories)) {
    const level = data.answers[choice.key];
    const experience = data.experience[choice.key];
    if (!level && !experience) continue;
    if (level) kept.answers[choice.key] = level;
    if (experience) kept.experience[choice.key] = experience;
    labels[choice.key] = [choice.item.name, choice.optionLabel];
  }
  for (const item of categories.flatMap((c) => c.items)) {
    const key = itemKey(item);
    const note = data.notes[key];
    if (note) {
      kept.notes[key] = note;
      itemNames[key] = item.name;
    }
  }
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    list: { slug: list.slug, name: list.name },
    exportedAt: now.toISOString(),
    data: kept,
    labels,
    itemNames,
  };
}

export function exportFileName(list: KinkList, extension: string, now = new Date()) {
  return `omnikinklist-${list.slug}-${now.toISOString().slice(0, 10)}.${extension}`;
}

export function generateExportHtml(list: KinkList, data: ListData, siteUrl: string, labels: ExportLabels, now = new Date()) {
  const payload = buildExportPayload(list, data, now);
  const categories = withCustom(list, data.custom, labels.yourItems);
  const stats = computeStats(allChoices(categories), payload.data.answers);
  const date = now.toLocaleDateString(labels.lang, { year: "numeric", month: "long", day: "numeric" });
  const { answers, experience, notes } = payload.data;

  const bar = LEVELS.filter((l) => stats.byLevel[l] > 0)
    .map((l) => `<span class="lv-${l}" style="flex:${stats.byLevel[l]}" title="${escapeHtml(labels.levels[l])}: ${stats.byLevel[l]}"></span>`)
    .join("");

  const statCells = LEVELS.map(
    (l) => `<div class="stat"><span class="dot lv-${l}"></span><b>${stats.byLevel[l]}</b><small>${escapeHtml(labels.levels[l])}</small></div>`,
  ).join("");

  const sections = categories
    .map((category) => {
      const cards = category.items
        .map((item) => {
          const rows = itemChoices(item)
            .map((choice) => ({ key: choice.key, label: choice.optionLabel }))
            .filter((row) => answers[row.key] || experience[row.key]);
          const note = notes[itemKey(item)];
          if (rows.length === 0 && !note) return "";
          const lines = rows
            .map((row) => {
              const level = answers[row.key];
              const exp = experience[row.key];
              return `<li><span>${row.label ? escapeHtml(row.label) : "&nbsp;"}${exp ? ` <i class="exp">${escapeHtml(labels.experience[exp])}</i>` : ""}</span>${level ? `<em class="chip lv-${level}">${escapeHtml(labels.levels[level])}</em>` : ""}</li>`;
            })
            .join("");
          return `<article><h3>${escapeHtml(item.name)}</h3>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}${lines ? `<ul>${lines}</ul>` : ""}${note ? `<blockquote><b>${escapeHtml(labels.note)}:</b> ${escapeHtml(note)}</blockquote>` : ""}</article>`;
        })
        .join("");
      return cards ? `<section><h2>${escapeHtml(category.name)}</h2><div class="grid">${cards}</div></section>` : "";
    })
    .join("");

  const summary = labels.summary.replace("{answered}", String(stats.answered)).replace("{total}", String(stats.total));

  return `<!doctype html>
<html lang="${escapeHtml(labels.lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="OmniKinkList">
<meta name="kinklist-version" content="${EXPORT_VERSION}">
<meta name="kinklist-type" content="${escapeHtml(list.slug)}">
<meta name="kinklist-export-date" content="${payload.exportedAt}">
<meta name="robots" content="noindex">
<title>${escapeHtml(labels.title)}</title>
<script type="application/json" id="okl-export">${inlineJson(payload)}</script>
<style>
:root{--bg:#faf7f6;--surface:#fff;--border:#e7dfdc;--fg:#1c1519;--muted:#5f555a;--accent:#d42a66;
--limit:#1c1519;--dislike:#c62f2f;--maybe:#b86a06;--indifferent:#5f6881;--like:#0f8a5a;--favorite:#d42a66;--on:#fff;color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#0c0a0d;--surface:#151116;--border:#29222b;--fg:#f4eff2;--muted:#b1a7ae;--accent:#ff4f8b;
--limit:#f4eff2;--dislike:#f26060;--maybe:#f5a524;--indifferent:#8f98ad;--like:#3ecf8e;--favorite:#ff4f8b;--on:#140c10;color-scheme:dark}}
:root[data-theme=dark]{--bg:#0c0a0d;--surface:#151116;--border:#29222b;--fg:#f4eff2;--muted:#b1a7ae;--accent:#ff4f8b;
--limit:#f4eff2;--dislike:#f26060;--maybe:#f5a524;--indifferent:#8f98ad;--like:#3ecf8e;--favorite:#ff4f8b;--on:#140c10;color-scheme:dark}
*{box-sizing:border-box;margin:0}
body{background:var(--bg);color:var(--fg);font:15px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;padding:32px 20px 64px}
main{max-width:1080px;margin:0 auto}
header{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap;padding-bottom:24px;border-bottom:1px solid var(--border)}
.eyebrow{color:var(--accent);font-size:13px;font-weight:600}
h1{font-size:clamp(28px,5vw,40px);letter-spacing:-.02em;line-height:1.1;margin-top:6px}
header p{color:var(--muted);margin-top:6px}
button{font:inherit;color:var(--fg);background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:8px 12px;cursor:pointer}
.summary{margin:28px 0 8px}
.bar{display:flex;height:10px;border-radius:99px;overflow:hidden;gap:2px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;margin-top:16px}
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
.exp{font-style:normal;font-size:11px;color:var(--muted);border:1px solid var(--border);border-radius:99px;padding:0 6px;margin-left:4px}
blockquote{margin-top:12px;font-size:13px;color:var(--muted);border-left:2px solid var(--accent);padding-left:10px}
.chip{font-style:normal;font-size:12px;font-weight:600;padding:2px 10px;border-radius:99px;color:var(--on);white-space:nowrap}
.lv-limit{background:var(--limit)}.lv-dislike{background:var(--dislike)}.lv-maybe{background:var(--maybe)}.lv-indifferent{background:var(--indifferent)}.lv-like{background:var(--like)}.lv-favorite{background:var(--favorite)}
.chip.lv-limit{color:var(--bg)}
footer{margin-top:56px;color:var(--muted);font-size:13px;text-align:center}
a{color:var(--accent)}
</style>
</head>
<body>
<main>
<header>
<div><div class="eyebrow">OmniKinkList: ${escapeHtml(list.name)}</div><h1>${escapeHtml(labels.heading)}</h1><p>${escapeHtml(summary)} ${escapeHtml(labels.exported.replace("{date}", date))}</p></div>
<button type="button" onclick="var r=document.documentElement,d=r.dataset.theme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');r.dataset.theme=d==='dark'?'light':'dark'">${escapeHtml(labels.toggleTheme)}</button>
</header>
<div class="summary"><div class="bar">${bar}</div><div class="stats">${statCells}</div></div>
${sections}
<footer><a href="${escapeHtml(siteUrl)}">OmniKinkList</a>. ${escapeHtml(labels.footer)}</footer>
</main>
</body>
</html>`;
}

export function downloadFile(content: BlobPart, fileName: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
