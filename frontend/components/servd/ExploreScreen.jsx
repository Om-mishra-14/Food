"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Img } from "./Plate";
import { IconArrowRight, IconSearch } from "./icons";
import { getCuisineDishes } from "@/actions/meals.actions";
import { AREAS, REGIONS } from "@/lib/servd/areas";
import { anim, stagger, UP } from "@/lib/servd/motion";

export default function ExploreScreen({ initialArea }) {
  const router = useRouter();
  const rootRef = useRef(null);
  const [area, setArea] = useState(initialArea);
  const [region, setRegion] = useState("All");
  const [query, setQuery] = useState("");
  const [meals, setMeals] = useState({});
  const [status, setStatus] = useState({});
  const [showAll, setShowAll] = useState(false);
  const [opening, setOpening] = useState(null);
  const [pending, startTransition] = useTransition();

  const statusRef = useRef({});
  const setAreaStatus = (a, v) => {
    statusRef.current = { ...statusRef.current, [a]: v };
    setStatus(statusRef.current);
  };
  const load = useCallback((a, force) => {
    const cur = statusRef.current[a];
    if (!force && (cur === "done" || cur === "loading")) return;
    setAreaStatus(a, "loading");
    getCuisineDishes(a)
      .then((list) => {
        setMeals((m) => ({ ...m, [a]: list }));
        setAreaStatus(a, "done");
      })
      .catch(() => setAreaStatus(a, "error"));
  }, []);

  useEffect(() => {
    load(area);
  }, [area, load]);

  // entrance
  useEffect(() => {
    stagger(rootRef.current, "[data-fade]", UP(16), { duration: 650, delay: 80, step: 90 });
    stagger(rootRef.current, "[data-area]", UP(14), { duration: 500, delay: 100, step: 25 });
  }, []);
  // region change pops the grid
  const firstRegion = useRef(true);
  useEffect(() => {
    if (firstRegion.current) { firstRegion.current = false; return; }
    stagger(rootRef.current, "[data-area]", [{ opacity: 0, transform: "scale(.92)" }, { opacity: 1, transform: "none" }], { duration: 420, step: 25, max: 16 });
  }, [region]);
  // dishes arrive: plates spin in, banner text rises, cards fade up
  const st = status[area];
  useEffect(() => {
    if (st !== "done") return;
    const root = rootRef.current;
    stagger(root, "[data-explate]", [{ opacity: 0, transform: "translateX(40px) rotate(-120deg) scale(.6)" }, { opacity: 1, transform: "none" }], { duration: 900, step: 120 });
    stagger(root, "[data-exfade]", UP(18), { duration: 650, step: 80 });
    stagger(root, "[data-excard]", [{ opacity: 0, transform: "translateY(26px) scale(.96)" }, { opacity: 1, transform: "none" }], { duration: 650, delay: 120, step: 55, max: 12 });
  }, [st, area]);
  useEffect(() => {
    if (showAll) rootRef.current?.querySelectorAll("[data-excard]").forEach((e, i) => i >= 24 && anim(e, UP(20), { duration: 550, delay: Math.min(i - 24, 12) * 50 }));
  }, [showAll]);

  const ea = AREAS.find((x) => x.a === area) || AREAS[8];
  const q = query.trim().toLowerCase();
  const regionAreas = AREAS.filter((x) => region === "All" || x.region === region);
  const qAreas = q ? regionAreas.filter((x) => x.a.toLowerCase().includes(q) || x.c.toLowerCase().includes(q)) : regionAreas;
  const qIsArea = q && qAreas.length > 0;
  const list = meals[area] || [];
  const dishes = q && !qIsArea ? list.filter((m) => m.title.toLowerCase().includes(q)) : list;
  const shown = showAll ? dishes : dishes.slice(0, 24);

  const pick = (a) => {
    if (a === area) return;
    setArea(a);
    setShowAll(false);
    window.history.replaceState(null, "", `/explore?area=${encodeURIComponent(a)}`);
  };
  const open = (m) => {
    setOpening(m.id);
    startTransition(() =>
      router.push(
        m.source === "ai"
          ? `/dashboard?cook=${encodeURIComponent(m.title)}&from=explore${m.img ? `&img=${encodeURIComponent(m.img)}` : ""}`
          : `/dashboard?meal=${m.id}&from=explore`
      )
    );
  };

  return (
    <div ref={rootRef} data-screen="1" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div data-fade="1" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 18, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 320px" }}>
          <h1 className="sv-h1">Explore world cuisines</h1>
          <p className="sv-lead" style={{ marginTop: 6 }}>Pick a country and we&apos;ll bring you its signature dishes.</p>
        </div>
        <label style={{ flex: "1 1 280px", maxWidth: 420, display: "flex", alignItems: "center", gap: 10, height: 54, padding: "0 18px", borderRadius: 999, background: "#fff", border: "1.5px dashed #C9C9D0" }}>
          <IconSearch />
          <input className="sv-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a cuisine or a dish" aria-label="Search a cuisine or a dish" />
        </label>
      </div>

      <div data-fade="1" className="sv-seg" style={{ alignSelf: "flex-start", maxWidth: "100%", overflowX: "auto" }}>
        {REGIONS.map((g) => (
          <button key={g} data-on={region === g ? "1" : "0"} onClick={() => setRegion(g)} style={{ flex: "none", height: 40, padding: "0 16px", fontSize: 14, whiteSpace: "nowrap" }}>{g}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(150px, 100%), 1fr))", gap: 10 }}>
        {(qAreas.length ? qAreas : regionAreas).map((x) => {
          const on = x.a === area;
          return (
            <button key={x.a} data-area="1" onClick={() => pick(x.a)} className="sv-area" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px 10px 10px", borderRadius: 20, border: `1.5px ${on ? "solid #121212" : "dashed #D2D2D8"}`, background: on ? "#121212" : "transparent", color: on ? "#fff" : "#121212", textAlign: "left" }}>
              <span style={{ width: 44, height: 44, flex: "none", borderRadius: "50%", background: on ? "#E11D24" : "#fff", color: on ? "#fff" : "#E11D24", display: "grid", placeItems: "center", fontSize: 14, fontWeight: 800, letterSpacing: ".04em" }}>{x.code}</span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 16, fontWeight: 700, lineHeight: 1.15 }}>{x.a}</span>
                <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: on ? "#B9B9C0" : "#6A6A72", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.c}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ position: "relative", background: "#121212", color: "#fff", borderRadius: 30, padding: "clamp(22px, 4vw, 34px)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 24, overflow: "hidden" }}>
        <div style={{ flex: "1 1 280px", minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          <div data-exfade="1" style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color: "#FF5A5F" }}>{ea.c} · {ea.region}</div>
          <div data-exfade="1" style={{ fontSize: "clamp(34px, 6vw, 56px)", fontWeight: 700, letterSpacing: "-.045em", lineHeight: 1 }}>{ea.a} kitchen</div>
          <div data-exfade="1" style={{ fontSize: 17, color: "#B9B9C0" }}>
            {st === "done" ? `${list.length} signature dishes to cook tonight` : st === "error" ? "Library offline" : "Gathering dishes…"}
          </div>
        </div>
        <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", paddingRight: 10, paddingLeft: 22 }}>
          {list.slice(0, 3).map((m) => (
            <div key={m.id} data-explate="1" style={{ width: "clamp(78px, 14vw, 120px)", height: "clamp(78px, 14vw, 120px)", marginLeft: -22, borderRadius: "50%", background: "#fff", padding: 7, boxSizing: "border-box", boxShadow: "0 20px 40px -16px rgba(0,0,0,.7)" }}>
              <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: "#3A3A40" }}><Img src={m.img} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /></div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div className="sv-eyebrow">{q && !qIsArea ? `Matching “${query.trim()}” · ` : ""}{ea.a} dishes</div>
        {!showAll && dishes.length > 24 && <button className="sv-link-btn" onClick={() => setShowAll(true)}>Show all {dishes.length}</button>}
      </div>

      {(!st || st === "loading") && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(190px, 100%), 1fr))", gap: 14 }}>
          {[0, 1, 2, 3].map((i) => <div key={i} className="sv-skel" style={{ aspectRatio: 0.82, borderRadius: 22, animationDelay: `${i * 120}ms` }} />)}
        </div>
      )}
      {st === "error" && (
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", padding: "18px 18px 18px 22px", borderRadius: 22, border: "1.5px dashed #E11D24", background: "#fff" }}>
          <span style={{ flex: 1, fontSize: 16, fontWeight: 600 }}>Couldn&apos;t reach the recipe library. Check your connection.</span>
          <button className="sv-btn-dark" onClick={() => load(area, true)} style={{ height: 44, padding: "0 20px", fontSize: 15, fontWeight: 700 }}>Try again</button>
        </div>
      )}
      {st === "done" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(190px, 100%), 1fr))", gap: 14 }}>
            {shown.map((m) => (
              <button key={m.id} data-excard="1" onClick={() => open(m)} className="sv-dash-card sv-excard" style={{ position: "relative", display: "flex", flexDirection: "column", gap: 10, padding: "10px 10px 14px", borderRadius: 24 }}>
                <div style={{ position: "relative", aspectRatio: 1, borderRadius: 18, overflow: "hidden", background: "#E8D6C3" }}>
                  <Img src={m.img} alt={m.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  {m.source === "ai" && <span style={{ position: "absolute", left: 10, top: 10, background: "#E11D24", color: "#fff", borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 800 }}>AI pick</span>}
                  {pending && opening === m.id && <div style={{ position: "absolute", inset: 0, background: "rgba(18,18,18,.55)", display: "grid", placeItems: "center", color: "#fff", fontSize: 15, fontWeight: 700 }}>Opening…</div>}
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "0 4px" }}>
                  <div className="sv-clamp2" style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 700, lineHeight: 1.25 }}>{m.title}</div>
                  <span style={{ width: 30, height: 30, flex: "none", borderRadius: "50%", background: "#121212", display: "grid", placeItems: "center" }}><IconArrowRight size={13} sw={2.6} /></span>
                </div>
              </button>
            ))}
          </div>
          {dishes.length === 0 && <div style={{ border: "1.5px dashed #D2D2D8", borderRadius: 22, padding: 26, fontSize: 16, color: "#6A6A72" }}>No {ea.a} dishes match “{query.trim()}”.</div>}
        </>
      )}
    </div>
  );
}
