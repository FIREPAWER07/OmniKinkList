import { allChoices, computeStats, withCustom } from "./choices";
import { LEVELS, type KinkList, type Level, type ListData } from "./types";

export interface SummaryImageOptions {
  title: string;
  subtitle: string;
  favoritesTitle: string;
  limitsTitle: string;
  footer: string;
  customCategory: string;
  levelLabels: Record<Level, string>;
  showFavorites: boolean;
  showLimits: boolean;
}

const WIDTH = 1080;
const HEIGHT = 1350;
const PAD = 80;
const COLORS = {
  bg: "#0c0a0d",
  surface: "#151116",
  border: "#29222b",
  fg: "#f4eff2",
  muted: "#b1a7ae",
  accent: "#ff4f8b",
  levels: { limit: "#f4eff2", dislike: "#f26060", maybe: "#f5a524", indifferent: "#8f98ad", like: "#3ecf8e", favorite: "#ff4f8b" } as Record<Level, string>,
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let end = text.length;
  while (end > 0 && ctx.measureText(`${text.slice(0, end)}…`).width > maxWidth) end--;
  return `${text.slice(0, end)}…`;
}

/** Draws a shareable summary card (1080x1350 PNG) of a list's answers. */
export async function renderSummaryImage(list: KinkList, data: ListData, options: SummaryImageOptions): Promise<Blob> {
  await document.fonts.ready;
  const font = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d")!;

  const categories = withCustom(list, data.custom, options.customCategory);
  const choices = allChoices(categories);
  const stats = computeStats(choices, data.answers);

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const glow = ctx.createRadialGradient(WIDTH, 0, 0, WIDTH, 0, 700);
  glow.addColorStop(0, "rgba(255, 79, 139, 0.18)");
  glow.addColorStop(1, "rgba(255, 79, 139, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  let y = PAD;
  ctx.textBaseline = "top";
  ctx.fillStyle = COLORS.accent;
  roundRect(ctx, PAD, y, 44, 44, 10);
  ctx.fillStyle = "#16070d";
  ctx.font = `700 26px ${font}`;
  ctx.fillText("O", PAD + 13, y + 8);
  ctx.fillStyle = COLORS.fg;
  ctx.font = `600 28px ${font}`;
  ctx.fillText("OmniKinkList", PAD + 60, y + 7);

  y += 100;
  ctx.font = `600 64px ${font}`;
  ctx.fillText(ellipsize(ctx, options.title, WIDTH - PAD * 2), PAD, y);
  y += 84;
  ctx.fillStyle = COLORS.muted;
  ctx.font = `400 32px ${font}`;
  ctx.fillText(options.subtitle, PAD, y);

  // Distribution bar.
  y += 76;
  const barWidth = WIDTH - PAD * 2;
  ctx.fillStyle = COLORS.surface;
  roundRect(ctx, PAD, y, barWidth, 28, 14);
  if (stats.answered > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(PAD, y, barWidth, 28, 14);
    ctx.clip();
    let x = PAD;
    for (const level of LEVELS) {
      const w = (stats.byLevel[level] / stats.answered) * barWidth;
      ctx.fillStyle = COLORS.levels[level];
      ctx.fillRect(x, y, w, 28);
      x += w;
    }
    ctx.restore();
  }

  // Legend in two columns, positive levels first.
  y += 60;
  const ordered = [...LEVELS].reverse();
  ordered.forEach((level, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = PAD + col * (barWidth / 2);
    const ly = y + row * 52;
    ctx.fillStyle = COLORS.levels[level];
    roundRect(ctx, x, ly + 6, 24, 24, 6);
    ctx.fillStyle = COLORS.fg;
    ctx.font = `500 30px ${font}`;
    ctx.fillText(options.levelLabels[level], x + 40, ly);
    ctx.fillStyle = COLORS.muted;
    const count = String(stats.byLevel[level]);
    ctx.fillText(count, x + barWidth / 2 - 40 - ctx.measureText(count).width, ly);
  });
  y += 3 * 52 + 40;

  const drawList = (title: string, level: Level, max: number) => {
    const entries = choices
      .filter((c) => data.answers[c.key] === level)
      .map((c) => (c.optionLabel ? `${c.item.name}: ${c.optionLabel}` : c.item.name));
    if (entries.length === 0 || y > HEIGHT - 260) return;
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PAD, y);
    ctx.lineTo(WIDTH - PAD, y);
    ctx.stroke();
    y += 32;
    ctx.fillStyle = COLORS.levels[level];
    ctx.font = `600 34px ${font}`;
    ctx.fillText(`${title} (${entries.length})`, PAD, y);
    y += 58;
    ctx.fillStyle = COLORS.fg;
    ctx.font = `400 28px ${font}`;
    const room = Math.max(0, Math.floor((HEIGHT - 170 - y) / 42));
    const shown = entries.slice(0, Math.min(max, room));
    const colWidth = (WIDTH - PAD * 2 - 40) / 2;
    shown.forEach((entry, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      ctx.fillText(ellipsize(ctx, entry, colWidth), PAD + col * (colWidth + 40), y + row * 42);
    });
    y += Math.ceil(shown.length / 2) * 42 + 24;
    if (entries.length > shown.length) {
      ctx.fillStyle = COLORS.muted;
      ctx.fillText(`+${entries.length - shown.length}`, PAD, y - 12);
      y += 30;
    }
  };

  if (options.showFavorites) drawList(options.favoritesTitle, "favorite", 16);
  if (options.showLimits) drawList(options.limitsTitle, "limit", 8);

  ctx.fillStyle = COLORS.muted;
  ctx.font = `400 26px ${font}`;
  ctx.textBaseline = "bottom";
  ctx.fillText(options.footer, PAD, HEIGHT - PAD + 20);

  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Canvas export failed"))), "image/png"));
}
