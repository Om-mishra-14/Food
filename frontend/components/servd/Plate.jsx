"use client";
import { FALLBACK_IMG } from "@/lib/servd/recipe";

// <img> that swaps to a beige plate placeholder when the photo fails to load.
export function Img({ src, alt = "", style, ...rest }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src || FALLBACK_IMG}
      alt={alt}
      style={style}
      onError={(e) => {
        const el = e.currentTarget;
        // thumbnail missing: try the full-size photo once
        if (/\/preview$/.test(el.src) && !el.dataset.full) {
          el.dataset.full = "1";
          el.src = el.src.replace(/\/preview$/, "");
          return;
        }
        if (e.currentTarget.dataset.fb) return;
        e.currentTarget.dataset.fb = "1";
        e.currentTarget.src = FALLBACK_IMG;
      }}
      {...rest}
    />
  );
}

// White dinner plate with a slowly spinning food photo.
export default function Plate({ src, alt, inset = 22, rim = 14, shadow, style, plateAttr = true }) {
  return (
    <div data-plate={plateAttr ? "1" : undefined} style={{ position: "absolute", inset: 0, ...style }}>
      <div
        className="sv-plate-rim"
        style={{
          boxShadow:
            shadow ||
            `0 40px 70px -30px rgba(40,20,10,.45), inset 0 0 0 1px rgba(0,0,0,.04), inset 0 0 0 ${rim}px #F2F2F4`,
        }}
      />
      <div data-spin="1" className="sv-plate-food" style={{ inset }}>
        <Img src={src} alt={alt} />
      </div>
    </div>
  );
}
