import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

/** Brand card used for link previews. Never contains anyone's answers. */
export function brandCard(title: string, subtitle: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "radial-gradient(circle at 100% 0%, rgba(255,79,139,0.28), rgba(12,10,13,0) 55%), #0c0a0d",
          color: "#f4eff2",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#ff4f8b",
              color: "#16070d",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              fontWeight: 700,
            }}
          >
            O
          </div>
          <div style={{ fontSize: 40, fontWeight: 600, display: "flex" }}>
            Omni<span style={{ color: "#ff4f8b" }}>Kink</span>List
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>{title}</div>
          <div style={{ fontSize: 34, color: "#b1a7ae" }}>{subtitle}</div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {["#f4eff2", "#f26060", "#f5a524", "#8f98ad", "#3ecf8e", "#ff4f8b"].map((color) => (
            <div key={color} style={{ width: 56, height: 14, borderRadius: 7, background: color }} />
          ))}
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
