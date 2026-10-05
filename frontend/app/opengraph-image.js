import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

// Preview card shown when the site is shared on WhatsApp, LinkedIn, X, etc.
export const alt = `${SITE_NAME} – AI recipes from what's in your fridge`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#1E1D1F",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 108, fontWeight: 800, letterSpacing: "-0.05em" }}>
          <span>fridge</span>
          <span style={{ color: "#E11D24" }}>2</span>
          <span>fork</span>
        </div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 46, fontWeight: 700, color: "#ECECEE" }}>
          Snap your fridge. Find what to cook.
        </div>
        <div style={{ display: "flex", marginTop: 18, fontSize: 32, color: "#9A9AA2" }}>
          AI recipes, step by step · zero food waste
        </div>
        <div style={{ display: "flex", marginTop: "auto", fontSize: 30, color: "#E11D24", fontWeight: 700 }}>
          fridge2fork.in
        </div>
      </div>
    ),
    size
  );
}
