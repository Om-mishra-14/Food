"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getOrGenerateRecipe } from "@/actions/recipe.actions";
import { suggestSubstitutions } from "@/actions/kitchen.actions";
import { useKitchen } from "@/components/servd/KitchenProvider";
import Plate from "@/components/servd/Plate";
import ShareModal from "@/components/servd/ShareModal";
import { IconArrowLeft, IconArrowRight, IconBulb, IconCheck, IconChef, IconMic, IconSearch, IconTimer } from "@/components/servd/icons";
import { cookHref, fmtClock, fromServd } from "@/lib/servd/recipe";
import { anim, motionOff, SPRING, stagger, UP, useSpins } from "@/lib/servd/motion";

export default function RecipePage() {
  return (
    <Suspense fallback={<Preparing title="" />}>
      <RecipeContent />
    </Suspense>
  );
}

function RecipeContent() {
  const sp = useSearchParams();
  const title = sp.get("cook");
  if (!title) return <HowToCook />;
  return <CookMode key={title} title={title} serves={Number(sp.get("serves")) || null} img={sp.get("img") || ""} />;
}

// ── "How to cook?" — the old header modal, now its own screen ─────────────
function HowToCook() {
  const router = useRouter();
  const { seen } = useKitchen();
  const [q, setQ] = useState("");
  const ref = useRef(null);
  useEffect(() => stagger(ref.current, "[data-fade]", UP(16), { duration: 650, step: 90 }), []);
  const submit = (e) => {
    e.preventDefault();
    if (q.trim()) router.push(cookHref(q.trim()));
  };
  return (
    <div ref={ref} data-screen="1" style={{ display: "flex", flexDirection: "column", gap: 26, padding: "10px 0 20px" }}>
      <div data-fade="1" style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <span style={{ width: 72, height: 72, flex: "none", borderRadius: "50%", background: "#E11D24", display: "grid", placeItems: "center", color: "#fff" }}><IconChef size={32} stroke="#fff" /></span>
        <div>
          <h1 className="sv-h1">How to cook?</h1>
          <p className="sv-lead" style={{ marginTop: 4 }}>Name any dish and our AI chef will walk you through it, step by step.</p>
        </div>
      </div>
      <form data-fade="1" onSubmit={submit} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <label style={{ flex: "1 1 320px", display: "flex", alignItems: "center", gap: 10, height: 60, padding: "0 20px", borderRadius: 999, background: "#fff", border: "1.5px dashed #C9C9D0" }}>
          <IconSearch />
          <input className="sv-input" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Butter chicken, Pad thai, Apple crumble" aria-label="Dish name" style={{ fontSize: 17 }} />
        </label>
        <button type="submit" className="sv-btn-dark" disabled={!q.trim()} style={{ height: 60, padding: "0 10px 0 28px", fontSize: 17, gap: 18, opacity: q.trim() ? 1 : 0.5 }}>
          Start cooking
          <span style={{ width: 42, height: 42, borderRadius: "50%", background: "#E11D24", display: "grid", placeItems: "center" }}><IconArrowRight /></span>
        </button>
      </form>
      {seen.length > 0 && (
        <div data-fade="1" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="sv-eyebrow">Recently viewed</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {seen.slice(0, 8).map((r) => (
              <Link key={r.key} href={cookHref(r.title)} className="sv-dash-card" style={{ display: "flex", alignItems: "center", gap: 10, height: 52, padding: "0 18px 0 5px", borderRadius: 999, fontSize: 15, fontWeight: 600, color: "#121212" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.img} alt="" style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover" }} />
                {r.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Preparing({ title }) {
  return (
    <div data-screen="1" style={{ display: "flex", flexWrap: "wrap", gap: 44, alignItems: "center", minHeight: 380 }}>
      <div className="sv-skel" style={{ flex: "0 0 clamp(150px, 40vw, 240px)", aspectRatio: 1, borderRadius: "50%" }} />
      <div style={{ flex: "1 1 320px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="sv-eyebrow" style={{ color: "#E11D24" }}>Preparing your recipe</div>
        <div style={{ fontSize: "clamp(30px, 5vw, 44px)", fontWeight: 700, letterSpacing: "-.03em", lineHeight: 1.08 }}>{title}</div>
        <p style={{ margin: 0, fontSize: 18, color: "#3A3A40" }}>Our AI chef is writing step-by-step instructions. New dishes take a few seconds.</p>
        <div style={{ height: 6, borderRadius: 6, background: "#E3E3E8", overflow: "hidden", maxWidth: 420 }}><div className="animate-slow-fill" style={{ height: "100%", background: "#E11D24", borderRadius: 6 }} /></div>
      </div>
    </div>
  );
}

function CookMode({ title, serves: servesParam, img }) {
  const router = useRouter();
  const k = useKitchen();
  const { setCook, setCurrent, saveLeftover } = k;
  const rootRef = useRef(null);
  const [r, setR] = useState(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [timerLeft, setTimerLeft] = useState(null);
  const [timerOn, setTimerOn] = useState(false);
  const [handsFree, setHandsFree] = useState(false);
  const [heard, setHeard] = useState("");
  const [voiceNote, setVoiceNote] = useState("");
  const [portions, setPortions] = useState(1);
  const [leftoverSaved, setLeftoverSaved] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const recRef = useRef(null), wakeRef = useRef(null), ivRef = useRef(null), prevStep = useRef(0);

  // load
  useEffect(() => {
    const fd = new FormData();
    fd.append("recipeName", title);
    if (img) fd.append("imageUrl", img);
    getOrGenerateRecipe(fd)
      .then((res) => {
        const rec = fromServd(res.recipe);
        setR(rec);
        if (!Object.keys(rec.subs).length && rec.ings.length)
          suggestSubstitutions(rec.title, rec.ings.map((i) => i.name)).then((s) => {
            const subs = {};
            s.substitutions.forEach((x) => x?.original && x.alternatives?.length && (subs[x.original] = x.alternatives.slice(0, 3)));
            setR((cur) => (cur ? { ...cur, subs } : cur));
          });
      })
      .catch((e) => setError(e.message || "Failed to load recipe"));
  }, [title, img]);

  const serves = servesParam || r?.baseServes || 2;
  useEffect(() => {
    if (!r) return;
    setCurrent(r, serves);
    setCook((c) => (c?.recipe?.key === r.key ? { ...c, recipe: r, serves } : { recipe: r, serves, checked: {}, swaps: {}, swapOpen: null }));
  }, [r, serves, setCook, setCurrent]);
  useEffect(() => () => setCook(null), [setCook]);

  // timer
  const resetTimer = useCallback(() => {
    clearInterval(ivRef.current);
    setTimerOn(false);
    setTimerLeft(null);
  }, []);
  useEffect(() => () => clearInterval(ivRef.current), []);
  const cur = r?.steps[step] || r?.steps[0];
  const toggleTimer = useCallback(() => {
    if (!cur?.timer) return;
    if (timerOn) { clearInterval(ivRef.current); setTimerOn(false); return; }
    if (timerLeft === 0) return;
    setTimerOn(true);
    setTimerLeft((t) => t ?? cur.timer * 60);
    clearInterval(ivRef.current);
    ivRef.current = setInterval(() => {
      setTimerLeft((t) => {
        if (t <= 1) {
          clearInterval(ivRef.current);
          setTimerOn(false);
          try { navigator.vibrate?.([200, 100, 200]); } catch {}
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [cur, timerOn, timerLeft]);

  // navigation
  const goStep = useCallback((n) => { resetTimer(); setStep(n); }, [resetTimer]);
  const next = useCallback(() => {
    if (!r) return;
    if (done) return router.push("/dashboard");
    if (step < r.steps.length - 1) goStep(step + 1);
    else { resetTimer(); setDone(true); }
  }, [r, done, step, goStep, resetTimer, router]);
  const back = useCallback(() => { if (step > 0 && !done) goStep(step - 1); }, [step, done, goStep]);
  const isLast = r && step === r.steps.length - 1;
  const nextLabel = done ? "Back to discover" : isLast ? "Finish & plate" : "Next step";
  useEffect(() => { setCook((c) => (c ? { ...c, next, nextLabel } : c)); }, [next, nextLabel, setCook]);

  useEffect(() => {
    const onKey = (e) => {
      if (/INPUT|TEXTAREA/.test(e.target.tagName) || shareOpen) return;
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, back, shareOpen]);

  // animations
  useSpins(rootRef, [r?.key, done]);
  useEffect(() => {
    if (!r) return;
    const root = rootRef.current;
    if (done) {
      anim(root.querySelector("[data-plate]"), [{ transform: "rotate(-160deg) scale(.5)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 1100 });
      stagger(root, "[data-fade]", UP(16), { duration: 600, delay: 400, step: 90 });
      return;
    }
    const dir = step >= prevStep.current ? 1 : -1;
    prevStep.current = step;
    anim(root.querySelector("[data-step]"), [{ opacity: 0, transform: `translateX(${dir * 56}px)` }, { opacity: 1, transform: "none" }], { duration: 600 });
    anim(root.querySelector("[data-stepnum]"), [{ transform: "translateY(100%)" }, { transform: "none" }], { duration: 700, delay: 60 });
  }, [r, step, done]);

  // hands-free: read aloud, keep screen awake, listen for commands
  const speak = useCallback(() => {
    if (!window.speechSynthesis || !r) return;
    const s = r.steps[step];
    try {
      speechSynthesis.cancel();
      speechSynthesis.speak(new SpeechSynthesisUtterance(done ? `All done. Enjoy your ${r.title}.` : `Step ${step + 1}. ${s.t}. ${s.d}`));
    } catch {}
  }, [r, step, done]);
  const cmdRef = useRef({});
  useEffect(() => {
    cmdRef.current = { next, back, speak, toggleTimer };
  }, [next, back, speak, toggleTimer]);
  const stopHands = useCallback(() => {
    const rec = recRef.current;
    recRef.current = null;
    try { rec?.stop(); } catch {}
    try { wakeRef.current?.release?.(); } catch {}
    wakeRef.current = null;
    try { window.speechSynthesis?.cancel(); } catch {}
    setHandsFree(false);
    setHeard("");
    setVoiceNote("");
  }, []);
  const startHands = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    let note = "";
    if (SR) {
      try {
        const rec = new SR();
        rec.continuous = true;
        rec.interimResults = false;
        rec.lang = "en-US";
        rec.onresult = (e) => {
          const t = e.results[e.results.length - 1][0].transcript.toLowerCase().trim();
          setHeard(t);
          const c = cmdRef.current;
          if (/next|continue|done|finish/.test(t)) c.next();
          else if (/back|previous/.test(t)) c.back();
          else if (/repeat|again|read/.test(t)) c.speak();
          else if (/timer|start|pause|stop/.test(t)) c.toggleTimer();
        };
        rec.onend = () => { if (recRef.current === rec) { try { rec.start(); } catch {} } };
        rec.onerror = (ev) => {
          if (ev.error === "not-allowed" || ev.error === "service-not-allowed") {
            recRef.current = null;
            setVoiceNote("Microphone blocked here — steps are still read aloud; use ← → keys or the buttons.");
          }
        };
        rec.start();
        recRef.current = rec;
      } catch {
        note = "Voice commands unavailable here — use ← → keys.";
      }
    } else note = "Voice commands aren't supported in this browser — use ← → keys. Read-aloud and screen-awake still work.";
    navigator.wakeLock?.request("screen").then((l) => (wakeRef.current = l)).catch(() => {});
    setVoiceNote(note);
    setHeard("");
    setHandsFree(true);
  };
  useEffect(() => () => stopHands(), [stopHands]);
  useEffect(() => { if (handsFree) speak(); }, [handsFree, step, done]); // eslint-disable-line react-hooks/exhaustive-deps
  const ringRef = useRef(null), barRef = useRef(null);
  useEffect(() => {
    if (!handsFree) return;
    if (ringRef.current && !motionOff()) ringRef.current.animate([{ transform: "scale(1)", opacity: 0.6 }, { transform: "scale(2)", opacity: 0 }], { duration: 1400, iterations: Infinity, easing: "ease-out" });
    anim(barRef.current, [{ opacity: 0, transform: "translateY(-10px)" }, { opacity: 1, transform: "none" }], { duration: 500 });
  }, [handsFree]);

  const lsRef = useRef(null);
  const onSaveLeftovers = async () => {
    if (await saveLeftover({ title: r.title, portions, imageUrl: r.img, idea: r.left })) {
      setLeftoverSaved(true);
      requestAnimationFrame(() => anim(lsRef.current, [{ opacity: 0, transform: "scale(.8)" }, { opacity: 1, transform: "none" }], { duration: 500, easing: SPRING }));
    }
  };
  const restart = () => {
    resetTimer();
    setStep(0);
    prevStep.current = 0;
    setDone(false);
    setLeftoverSaved(false);
    setPortions(1);
    setCook((c) => (c ? { ...c, checked: {} } : c));
  };

  if (error)
    return (
      <div data-screen="1" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 16, padding: "60px 10px" }}>
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-.02em" }}>Couldn&apos;t load this recipe</div>
        <p style={{ margin: 0, fontSize: 17, color: "#3A3A40", maxWidth: 420 }}>{error}</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="sv-btn-ghost" onClick={() => router.back()} style={{ height: 52, padding: "0 24px", fontSize: 16 }}>Go back</button>
          <button className="sv-btn-dark" onClick={() => window.location.reload()} style={{ height: 52, padding: "0 24px", fontSize: 16 }}>Retry</button>
        </div>
      </div>
    );
  if (!r) return <Preparing title={title} />;

  const left = timerLeft ?? (cur.timer ? cur.timer * 60 : 0);

  return (
    <div ref={rootRef} data-screen="1" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <button onClick={() => router.back()} title="Back" className="sv-btn-ghost" style={{ width: 50, height: 50, padding: 0, borderRadius: "50%" }}><IconArrowLeft /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sv-eyebrow" style={{ color: "#E11D24" }}>Now cooking</div>
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-.02em" }}>{r.title}</div>
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#6A6A72", fontVariantNumeric: "tabular-nums" }}>{done ? "All steps done" : `Step ${step + 1} of ${r.steps.length}`}</div>
        <button
          onClick={() => (handsFree ? stopHands() : startHands())}
          aria-pressed={handsFree}
          style={{ display: "flex", alignItems: "center", gap: 10, height: 50, padding: "0 20px 0 10px", borderRadius: 999, border: `1.5px ${handsFree ? "solid #E11D24" : "dashed #C9C9D0"}`, background: handsFree ? "#E11D24" : "#fff", color: handsFree ? "#fff" : "#121212", fontSize: 16, fontWeight: 700, transition: "all .35s cubic-bezier(.22,1,.36,1)" }}
        >
          <span style={{ position: "relative", width: 32, height: 32, borderRadius: "50%", background: handsFree ? "#fff" : "#121212", display: "grid", placeItems: "center" }}>
            {handsFree && <span ref={ringRef} style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#fff" }} />}
            <IconMic stroke={handsFree ? "#E11D24" : "#fff"} />
          </span>
          {handsFree ? "Hands-free on" : "Hands-free"}
        </button>
      </div>

      {handsFree && (
        <div ref={barRef} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "14px 18px", borderRadius: 20, background: "#fff", border: "1.5px dashed #D2D2D8", fontSize: 15 }}>
          <b style={{ color: "#E11D24" }}>Listening</b>
          <span style={{ color: "#3A3A40" }}>Say “next”, “back”, “repeat” or “start timer”. Steps are read aloud and the screen stays awake. ← → keys work too.</span>
          {heard && <span style={{ marginLeft: "auto", background: "#121212", color: "#fff", borderRadius: 999, padding: "5px 12px", fontWeight: 700 }}>Heard: “{heard}”</span>}
          {voiceNote && <span style={{ width: "100%", color: "#E11D24", fontWeight: 600 }}>{voiceNote}</span>}
        </div>
      )}

      <div style={{ display: "flex", gap: 6 }}>
        {r.steps.map((_, i) => {
          const full = done || i < step;
          return (
            <div key={i} style={{ flex: 1, height: 6, borderRadius: 6, background: "#E3E3E8", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${full ? 100 : i === step ? 40 : 0}%`, background: full ? "#121212" : "#E11D24", borderRadius: 6, transition: "width .7s cubic-bezier(.22,1,.36,1), background .4s" }} />
            </div>
          );
        })}
      </div>

      {!done ? (
        <>
          <div data-step="1" style={{ display: "flex", flexWrap: "wrap", gap: 44, alignItems: "center", minHeight: 380, padding: "10px 0" }}>
            <div style={{ flex: "0 0 clamp(150px, 40vw, 240px)", aspectRatio: 1, position: "relative" }}>
              <Plate src={r.img} inset={16} plateAttr={false} shadow="0 30px 60px -28px rgba(40,20,10,.45), inset 0 0 0 10px #F2F2F4" />
            </div>
            <div style={{ flex: "1 1 360px", minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ overflow: "hidden" }}>
                <div data-stepnum="1" style={{ fontSize: "clamp(64px, 14vw, 112px)", lineHeight: 0.95, fontWeight: 800, letterSpacing: "-.05em", color: "transparent", WebkitTextStroke: "2px #121212" }}>{String(step + 1).padStart(2, "0")}</div>
              </div>
              <div style={{ fontSize: "clamp(26px, 5vw, 40px)", fontWeight: 700, letterSpacing: "-.03em", lineHeight: 1.08 }}>{cur.t}</div>
              <p style={{ margin: 0, fontSize: 20, lineHeight: 1.55, color: "#3A3A40", maxWidth: 620, textWrap: "pretty" }}>{cur.d}</p>
              {cur.tip && (
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "16px 18px", borderRadius: 18, border: "1.5px dashed #D2D2D8", background: "#fff", maxWidth: 620 }}>
                  <IconBulb />
                  <div style={{ fontSize: 16, lineHeight: 1.5 }}><b>Chef&apos;s tip · </b>{cur.tip}</div>
                </div>
              )}
              {cur.timer > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 14, alignSelf: "flex-start", background: "#fff", borderRadius: 999, padding: "6px 6px 6px 20px", boxShadow: "0 10px 26px -16px rgba(0,0,0,.3)" }}>
                  <IconTimer />
                  <span style={{ fontSize: 24, fontWeight: 700, fontVariantNumeric: "tabular-nums", minWidth: 70 }}>{fmtClock(left)}</span>
                  <button onClick={toggleTimer} style={{ height: 44, padding: "0 20px", border: 0, borderRadius: 999, background: timerOn ? "#E11D24" : "#121212", color: "#fff", fontSize: 15, fontWeight: 700, transition: "background .3s" }}>
                    {timerOn ? "Pause" : timerLeft === 0 ? "Done" : timerLeft ? "Resume" : "Start"}
                  </button>
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <button onClick={back} className="sv-btn-ghost" style={{ height: 56, padding: "0 26px", fontSize: 17, opacity: step > 0 ? 1 : 0.4 }}><IconArrowLeft size={16} sw={2.4} />Previous</button>
            <button onClick={next} className="sv-btn-dark" style={{ height: 56, padding: "0 10px 0 28px", fontSize: 17, gap: 18 }}>
              {nextLabel}
              <span style={{ width: 40, height: 40, borderRadius: "50%", background: "#E11D24", display: "grid", placeItems: "center" }}><IconArrowRight size={16} /></span>
            </button>
          </div>
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 18, padding: "30px 0 20px" }}>
          <div style={{ width: 300, maxWidth: "80%", aspectRatio: 1, position: "relative" }}>
            <Plate src={r.img} inset={20} rim={12} />
          </div>
          <h2 data-fade="1" style={{ margin: "10px 0 0", fontSize: "clamp(32px, 6vw, 48px)", fontWeight: 700, letterSpacing: "-.04em" }}>Plated. Enjoy.</h2>
          <p data-fade="1" style={{ margin: 0, fontSize: 19, color: "#3A3A40", maxWidth: 440 }}>Your {r.title} is ready.</p>
          <div data-fade="1" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "center", background: "#fff", borderRadius: 28, padding: "8px 8px 8px 22px", border: "1.5px dashed #D2D2D8", minHeight: 56, boxSizing: "border-box" }}>
            {!leftoverSaved ? (
              <>
                <span style={{ fontSize: 16, fontWeight: 700 }}>Any leftovers?</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button onClick={() => setPortions((p) => Math.max(1, p - 1))} aria-label="Fewer portions" style={{ width: 34, height: 34, padding: 0, border: 0, borderRadius: "50%", background: "#EDEDF0", fontSize: 18, fontWeight: 700 }}>−</button>
                  <span style={{ minWidth: 86, fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{portions} {portions === 1 ? "portion" : "portions"}</span>
                  <button onClick={() => setPortions((p) => Math.min(6, p + 1))} aria-label="More portions" style={{ width: 34, height: 34, padding: 0, border: 0, borderRadius: "50%", background: "#EDEDF0", fontSize: 18, fontWeight: 700 }}>+</button>
                </div>
                <button className="sv-btn-dark" onClick={onSaveLeftovers} style={{ height: 42, padding: "0 18px", fontSize: 15, fontWeight: 700 }}>Save to pantry</button>
              </>
            ) : (
              <span ref={lsRef} style={{ display: "flex", alignItems: "center", gap: 10, paddingRight: 14, fontSize: 16, fontWeight: 700 }}>
                <span style={{ width: 28, height: 28, borderRadius: "50%", background: "#E11D24", display: "grid", placeItems: "center" }}><IconCheck /></span>
                Leftovers saved. We&apos;ll suggest what to do with them on your dashboard.
              </span>
            )}
          </div>
          <div data-fade="1" style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <button className="sv-btn-ghost" onClick={() => setShareOpen(true)} style={{ height: 56, padding: "0 26px", fontSize: 17 }}>Share your plate</button>
            <button className="sv-btn-ghost" onClick={restart} style={{ height: 56, padding: "0 26px", fontSize: 17 }}>Cook it again</button>
            <Link href="/dashboard" className="sv-btn-dark" style={{ height: 56, padding: "0 28px", fontSize: 17 }}>Find something else</Link>
          </div>
        </div>
      )}

      {shareOpen && <ShareModal recipe={r} serves={serves} swaps={k.cook?.swaps || {}} onClose={() => setShareOpen(false)} />}
    </div>
  );
}
