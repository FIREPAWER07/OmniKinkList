import { getT } from "@/i18n/server";
import { brandCard, OG_SIZE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "OmniKinkList";

export default async function Image() {
  const t = await getT();
  return brandCard(`${t("home.titleBefore")} ${t("home.titleHighlight")} ${t("home.titleAfter")}`, t("home.subtitle"));
}
