"use client";
// Fridge2Fork brand: the F2F mark (a 2 whose tail bends up into a fork),
// the "fridge2fork" wordmark and the red splash that plays on first load.
import { useEffect, useRef, useState } from "react";
import { SPLASH_DONE } from "@/lib/servd/motion";

export const BRAND = "Fridge2Fork";
export const TAGLINE = "From your fridge, to your fork…";
const WORD = BRAND.toLowerCase();

// The 2 runs right, turns up into the fork handle; the fork head is a U with a centre prong.
const TWO = "M6 13c1-5.5 11-6.5 12 0 .6 3.6-2 6.2-4.6 9.4L6.5 32H26a3 3 0 0 0 3-3V18";
const FORK_HEAD = "M24 7v6a5 5 0 0 0 10 0V7";
const FORK_PRONG = "M29 18V7";

export function LogoMark({ size = 28, color = "#fff" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={TWO} />
      <path d={FORK_HEAD} />
      <path d={FORK_PRONG} />
    </svg>
  );
}

// "fridge" + red "2" + "fork"
export function Wordmark({ twoColor = "var(--sv-red)" }) {
  const [a, b] = WORD.split("2");
  return (
    <span className="sv-logo-word">
      {a}
      <span style={{ color: twoColor }}>2</span>
      {b}
    </span>
  );
}

const SEEN_KEY = "f2f-splash";
const HOLD = 2600; // ms before the curtain lifts; matches .sv-splash animation-delay
const LIFT = 800;

// Server-rendered and driven by CSS so it covers the page from the first paint.
// An inline script in the root layout hides it (html.sv-nosplash) after the first
// visit in a tab; reduced-motion users never see it.
export function Splash() {
  const ref = useRef(null);
  const [on, setOn] = useState(true);

  useEffect(() => {
    const el = ref.current;
    const finish = () => {
      window.__svSplashDone = true;
      window.dispatchEvent(new Event(SPLASH_DONE));
    };
    if (!el || getComputedStyle(el).display === "none") {
      finish();
      setOn(false);
      return;
    }
    try { sessionStorage.setItem(SEEN_KEY, "1"); } catch {}
    // The CSS animation has been running since first paint; line up with it.
    const lift = el.getAnimations?.().find((a) => a.animationName === "sv-sp-lift");
    const elapsed = lift ? Number(lift.currentTime) || 0 : performance.now();
    const toLift = Math.max(0, HOLD - elapsed);
    // Home's entrance starts while the curtain is still rising, as in the design.
    const t1 = setTimeout(finish, toLift + 320);
    const t2 = setTimeout(() => setOn(false), toLift + LIFT + 50);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (!on) return null;
  return (
    <div ref={ref} className="sv-splash" role="status" aria-label={`Loading ${BRAND}`}>
      <div className="sv-sp-ring" />
      <div className="sv-sp-stack">
        <div className="sv-sp-bob">
          <div className="sv-sp-mark">
            <svg width="88" height="88" viewBox="0 0 40 40" fill="none" stroke="#E11D24" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" style={{ overflow: "visible" }} aria-hidden="true">
              <path className="sv-sp-draw" pathLength="1" d={TWO} />
              <path className="sv-sp-tine" pathLength="1" d={FORK_HEAD} />
              <path className="sv-sp-tine" pathLength="1" d={FORK_PRONG} style={{ animationDelay: "1.3s" }} />
            </svg>
          </div>
        </div>
        <div className="sv-sp-word" aria-hidden="true">
          {WORD.split("").map((ch, i) => (
            <span key={i} style={{ animationDelay: `${380 + i * 70}ms`, color: /\d/.test(ch) ? "#121212" : "#fff" }}>{ch}</span>
          ))}
        </div>
        <div className="sv-sp-tag">
          <div style={{ fontSize: 18, fontWeight: 600, color: "#fff" }}>{TAGLINE}</div>
          <div className="sv-sp-track"><div className="sv-sp-bar" /></div>
        </div>
      </div>
    </div>
  );
}

// Inline script for <head>: skip the splash on repeat loads within the same tab.
export const SPLASH_GATE = `try{if(sessionStorage.getItem("${SEEN_KEY}"))document.documentElement.classList.add("sv-nosplash")}catch(e){}`;
