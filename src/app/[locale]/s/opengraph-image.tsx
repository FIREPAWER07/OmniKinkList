import { getT } from "@/i18n/server";
import { brandCard, OG_SIZE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "OmniKinkList";

/** Share links keep answers in the URL hash, so the preview can never show them. */
export default async function Image() {
  const t = await getT();
  return brandCard(t("shared.ogTitle"), t("shared.ogSubtitle"));
}
