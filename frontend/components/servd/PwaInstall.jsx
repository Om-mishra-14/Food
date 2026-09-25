"use client";
// Registers the service worker and offers to install Fridge2Fork as an app:
// Chrome/Edge/Android get an "Install" button (beforeinstallprompt);
// iPhone/iPad Safari get "Share → Add to Home Screen" instructions.
import { useEffect, useRef, useState } from "react";
import { IconX } from "./icons";
import { anim, SPRING } from "@/lib/servd/motion";

const DISMISS_KEY = "servd-install-dismissed";
const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;

export default function PwaInstall() {
  const [mode, setMode] = useState(null); // "prompt" | "ios" | null
  const deferred = useRef(null);
  const cardRef = useRef(null);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      const register = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
      if (document.readyState === "complete") register();
      else window.addEventListener("load", register, { once: true });
    }

    if (isStandalone()) return;
    let dismissed = false;
    try { dismissed = Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < 14 * 86400000; } catch {}
    if (dismissed) return;

    const onPrompt = (e) => {
      e.preventDefault();
      deferred.current = e;
      setTimeout(() => setMode("prompt"), 4000);
    };
    const onInstalled = () => setMode(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const safari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
    const t = ios && safari ? setTimeout(() => setMode("ios"), 6000) : null;

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (mode) anim(cardRef.current, [{ opacity: 0, transform: "translateY(30px) scale(.94)" }, { opacity: 1, transform: "none" }], { duration: 550, easing: SPRING });
  }, [mode]);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setMode(null);
  };
  const install = async () => {
    const e = deferred.current;
    if (!e) return;
    e.prompt();
    const { outcome } = await e.userChoice.catch(() => ({}));
    deferred.current = null;
    if (outcome !== "accepted") dismiss();
    else setMode(null);
  };

  if (!mode) return null;
  return (
    <div ref={cardRef} className="sv-install" role="dialog" aria-label="Install Fridge2Fork">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="" width={48} height={48} style={{ borderRadius: 14, flex: "none" }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Install Fridge2Fork</div>
        <div style={{ fontSize: 14, color: "#B9B9C0", lineHeight: 1.35 }}>
          {mode === "ios" ? (
            <>Tap <b style={{ color: "#fff" }}>Share</b> <ShareGlyph /> then <b style={{ color: "#fff" }}>Add to Home Screen</b>.</>
          ) : (
            "Add it to your home screen — opens full screen, like an app."
          )}
        </div>
      </div>
      {mode === "prompt" && (
        <button className="sv-btn-red" onClick={install} style={{ height: 42, padding: "0 18px", fontSize: 15, flex: "none" }}>Install</button>
      )}
      <button onClick={dismiss} title="Not now" aria-label="Not now" style={{ width: 34, height: 34, flex: "none", padding: 0, border: 0, borderRadius: "50%", background: "rgba(255,255,255,.12)", color: "#fff", display: "grid", placeItems: "center" }}>
        <IconX size={12} />
      </button>
    </div>
  );
}

function ShareGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-2px" }} aria-hidden="true">
      <path d="M12 3v12M7 8l5-5 5 5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}
