"use client";
// Web Animations helpers used across the redesign. Everything turns into a
// no-op when the visitor prefers reduced motion.
import { useEffect, useRef, useState } from "react";

export const EASE = "cubic-bezier(.22,1,.36,1)";
export const SPRING = "cubic-bezier(.34,1.56,.64,1)";

export function motionOff() {
  return typeof window === "undefined" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function anim(el, keyframes, o = {}) {
  if (!el || motionOff() || !el.animate) return null;
  return el.animate(keyframes, {
    duration: o.duration || 600,
    delay: o.delay || 0,
    easing: o.easing || EASE,
    fill: o.fill || "backwards",
  });
}

export const qa = (root, sel) => Array.from(root?.querySelectorAll?.(sel) || []);

// Staggered entrance for every element matching `sel` inside `root`.
export function stagger(root, sel, keyframes, { duration = 600, delay = 0, step = 70, max = 20, easing } = {}) {
  qa(root, sel).forEach((el, i) => anim(el, keyframes, { duration, delay: delay + Math.min(i, max) * step, easing }));
}

// Fired once the load splash starts lifting (or right away when there is none).
export const SPLASH_DONE = "sv:splash-done";

// Run fn once the splash is out of the way. Returns a cleanup.
export function afterSplash(fn) {
  if (typeof window === "undefined") return () => {};
  const el = document.querySelector(".sv-splash");
  if (window.__svSplashDone || !el || getComputedStyle(el).display === "none") {
    fn();
    return () => {};
  }
  window.addEventListener(SPLASH_DONE, fn, { once: true });
  return () => window.removeEventListener(SPLASH_DONE, fn);
}

export const UP = (px = 16) => [{ opacity: 0, transform: `translateY(${px}px)` }, { opacity: 1, transform: "none" }];

// Plate spins in, chips pop, title words rise, the rest fades up.
export function heroAnim(root) {
  if (!root) return;
  anim(qa(root, "[data-plate]")[0], [{ transform: "rotate(-160deg) scale(.55)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 1100 });
  stagger(root, "[data-chip]", [{ opacity: 0, transform: "scale(.6)" }, { opacity: 1, transform: "none" }], { duration: 600, delay: 650, step: 120, easing: SPRING });
  stagger(root, "[data-w]", [{ transform: "translateY(110%)" }, { transform: "none" }], { duration: 750, delay: 100, step: 70 });
  stagger(root, "[data-fade]", UP(14), { duration: 600, delay: 220, step: 70 });
  stagger(root, "[data-tile]", [{ opacity: 0, transform: "translateY(10px) scale(.75)" }, { opacity: 1, transform: "none" }], { duration: 550, delay: 420, step: 50, easing: SPRING });
}

export function screenAnim(root) {
  if (!root) return;
  anim(root, UP(18), { duration: 650 });
  stagger(root, "[data-card]", UP(22), { duration: 650, delay: 300, step: 70 });
}

// Slowly rotate every [data-spin] photo inside root.
export function useSpins(rootRef, deps = []) {
  useEffect(() => {
    if (motionOff()) return;
    const els = qa(rootRef.current, "[data-spin]");
    const running = els.map((el) => {
      if (el.__spin) return null;
      el.__spin = el.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }], { duration: 80000, iterations: Infinity });
      return el;
    });
    return () => running.forEach((el) => { if (el) { el.__spin.cancel(); el.__spin = null; } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// Count a number up/down to its new value.
export function useTween(target, duration = 800) {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (motionOff() || from.current === target) {
      from.current = target;
      setShown(target);
      return;
    }
    const start = from.current, t0 = performance.now();
    let raf;
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / duration), e = 1 - Math.pow(1 - k, 3);
      const v = Math.round(start + (target - start) * e);
      from.current = v;
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return shown;
}

// Sections fade up as they scroll into view.
export function useReveal(rootRef, deps = []) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || motionOff() || typeof IntersectionObserver === "undefined") return;
    const els = qa(root, "[data-reveal]");
    els.forEach((el) => (el.style.opacity = "0"));
    let io, safety;
    // Wait for the load splash so sections already in view animate where people can see them.
    const offSplash = afterSplash(() => {
      io = new IntersectionObserver(
        (ents) =>
          ents.forEach((en) => {
            if (!en.isIntersecting) return;
            const el = en.target;
            io.unobserve(el);
            el.style.opacity = "";
            el.animate(UP(40), { duration: 900, easing: EASE, fill: "backwards" });
            qa(el, "[data-rchild]").forEach((c, i) =>
              c.animate(UP(26), { duration: 750, delay: 150 + i * 90, easing: EASE, fill: "backwards" })
            );
          }),
        { threshold: 0.12 }
      );
      els.forEach((el) => io.observe(el));
      safety = setTimeout(() => els.forEach((el) => { if (el.style.opacity === "0" && el.getBoundingClientRect().top < innerHeight) el.style.opacity = ""; }), 2500);
    });
    return () => { offSplash(); io?.disconnect(); clearTimeout(safety); els.forEach((el) => (el.style.opacity = "")); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// Expand an element from 0 to its natural height.
export function openHeight(el, duration = 480) {
  if (!el) return;
  anim(el, [{ height: "0px", opacity: 0 }, { height: el.scrollHeight + "px", opacity: 1 }], { duration });
}

// Slide an element out, then run done().
export function slideOut(el, done, keyframes) {
  const a = el && !motionOff() ? el.animate(keyframes || [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateX(40px) scale(.9)" }], { duration: 280, easing: "ease-in", fill: "forwards" }) : null;
  if (a) a.finished.then(() => { done(); requestAnimationFrame(() => a.cancel()); });
  else done();
}

// Throw a copy of an ingredient image in an arc onto a target element.
// Returns false (and does nothing) when the target is off-screen.
export function flyTo(srcImg, target, done) {
  const off = target && (() => { const b = target.getBoundingClientRect(); return b.top > innerHeight - 40 || b.bottom < 0 || b.width === 0; })();
  if (!srcImg || !target || motionOff() || off) { done(); return false; }
  const s = srcImg.getBoundingClientRect(), t = target.getBoundingClientRect(), size = 56;
  const x0 = s.left + s.width / 2 - size / 2, y0 = s.top + s.height / 2 - size / 2, x1 = t.left + 16, y1 = t.top + 12;
  const outer = document.createElement("div");
  outer.style.cssText = `position:fixed;left:${x0}px;top:${y0}px;width:${size}px;height:${size}px;z-index:9999;pointer-events:none`;
  const inner = document.createElement("div");
  inner.style.cssText = "width:100%;height:100%;border-radius:50%;background:#fff;display:grid;place-items:center;box-shadow:0 14px 30px -10px rgba(0,0,0,.45)";
  const img = document.createElement("img");
  img.src = srcImg.src;
  img.style.cssText = "width:72%;height:72%;object-fit:contain";
  inner.appendChild(img);
  outer.appendChild(inner);
  document.body.appendChild(outer);
  outer.animate([{ transform: "translateX(0)" }, { transform: `translateX(${x1 - x0}px)` }], { duration: 820, easing: "cubic-bezier(.45,0,.4,1)", fill: "forwards" });
  inner
    .animate([{ transform: "translateY(0) scale(1.15)" }, { transform: `translateY(${y1 - y0}px) scale(.85)` }], { duration: 820, easing: "cubic-bezier(.4,-0.7,.6,1)", fill: "forwards" })
    .finished.then(() => { outer.remove(); done(); });
  return true;
}

export const BUMP = [{ transform: "scale(1)" }, { transform: "scale(1.4)" }, { transform: "scale(1)" }];
