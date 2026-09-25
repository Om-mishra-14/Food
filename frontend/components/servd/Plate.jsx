"use client";
import { useCallback, useEffect, useRef } from "react";
import { FALLBACK_IMG, ingFallback, ingImgs } from "@/lib/servd/recipe";

// <img> that swaps to a beige plate placeholder when the photo fails to load.
// <img> that works through fallbacks when a photo is missing:
// "<photo>/preview" → full photo → each of `alts` → `fallback` (beige plate by
// default). Pass `ingredient` to use TheMealDB ingredient-name variants.
// It also catches photos that failed before React hydrated, which never
// fire onError on the client.
export function Img({ src, alt = "", style, alts, fallback, ingredient, ...rest }) {
  const ref = useRef(null);
  const candidates = ingredient ? ingImgs(ingredient) : [src, ...(alts || [])];
  const chain = candidates.filter(Boolean);
  const last = fallback || (ingredient ? ingFallback(ingredient) : FALLBACK_IMG);
  const first = chain[0] || last;
  const key = chain.join("|");

  const next = useCallback(
    (el) => {
      const cur = el.getAttribute("src") || "";
      if (/\/preview$/.test(cur)) return (el.src = cur.replace(/\/preview$/, ""));
      const step = Number(el.dataset.step || 0) + 1;
      el.dataset.step = String(step);
      const upcoming = chain[step];
      if (upcoming) el.src = upcoming;
      else if (cur !== last) el.src = last;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, last]
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.dataset.step = "0";
    if (el.complete && el.naturalWidth === 0 && el.getAttribute("src") !== last) next(el);
  }, [key, last, next]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={first}
      alt={alt}
      style={style}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={(e) => next(e.currentTarget)}
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
