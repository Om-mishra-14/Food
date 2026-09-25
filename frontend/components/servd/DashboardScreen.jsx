"use client";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useKitchen } from "./KitchenProvider";
import Plate, { Img } from "./Plate";
import ShareModal from "./ShareModal";
import { IconArrowLeft, IconArrowRight, IconBookmark, IconCheck, IconClock, IconFilter, IconFlame, IconList, IconLock, IconPeople, IconPlus, IconShare, IconSwap } from "./icons";
import { getMealInsights, listMeals, lookupMeals } from "@/actions/meals.actions";
import { getOrGenerateRecipe } from "@/actions/recipe.actions";
import { blockReason, cookHref, DIETS, filterCount, fmtTime, fromMealDB, fromServd, heroHref, thumb, matchOf, NO_FILTERS, passes, scaleAmount, soonUses, SPICE } from "@/lib/servd/recipe";
import { DASH_CUISINES, findArea } from "@/lib/servd/areas";
import { anim, EASE, heroAnim, motionOff, openHeight, screenAnim, stagger, useSpins, useTween } from "@/lib/servd/motion";

export default function DashboardScreen({ categories, activeCat, heroMeal, cookTitle, cookImg, fromExplore, isRecipeOfDay }) {
  const [feedMeals, setFeedMeals] = useState([]);
  const k = useKitchen();
  const router = useRouter();
  const rootRef = useRef(null), catRef = useRef(null), saveRef = useRef(null), drawerRef = useRef(null);
  const [serves, setServes] = useState(2);
  const [insights, setInsights] = useState({});
  const [servd, setServd] = useState(null);
  const [servdError, setServdError] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [catInd, setCatInd] = useState(null);

  // ── data ────────────────────────────────────────────────────────────────
  // Hero first, then the "Cook next" feed, then AI insights for all of them.
  useEffect(() => {
    let live = true;
    const heroOnly = heroMeal ? getMealInsights([heroMeal]).then((i) => live && setInsights((c) => ({ ...c, ...i }))).catch(() => {}) : null;
    if (!activeCat) return () => { live = false; };
    listMeals("category", activeCat)
      .then((list) => lookupMeals(list.filter((m) => m.id !== heroMeal?.idMeal).slice(0, 6).map((m) => m.id)))
      .then(async (meals) => {
        if (!live) return;
        setFeedMeals(meals);
        await heroOnly;
        const ins = await getMealInsights(meals);
        if (live) setInsights((c) => ({ ...c, ...ins }));
      })
      .catch(() => {});
    return () => { live = false; };
  }, [heroMeal, activeCat]);

  useEffect(() => {
    if (!cookTitle) return;
    const fd = new FormData();
    fd.append("recipeName", cookTitle);
    if (cookImg) fd.append("imageUrl", cookImg);
    getOrGenerateRecipe(fd)
      .then((r) => setServd(fromServd(r.recipe)))
      .catch(() => setServdError(true));
  }, [cookTitle, cookImg]);

  const r = useMemo(() => {
    if (cookTitle) return servd;
    return heroMeal ? fromMealDB(heroMeal, insights[heroMeal.idMeal]) : null;
  }, [cookTitle, servd, heroMeal, insights]);
  const feed = useMemo(() => feedMeals.map((m) => fromMealDB(m, insights[m.idMeal])), [feedMeals, insights]);

  const { setCurrent } = k;
  useEffect(() => { if (r) setCurrent(r, serves); }, [r, serves, setCurrent]);

  // ── motion ──────────────────────────────────────────────────────────────
  const heroKey = r?.key;
  useSpins(rootRef, [heroKey]);
  useEffect(() => {
    if (!heroKey) return;
    heroAnim(rootRef.current);
    stagger(rootRef.current, "[data-card]", [{ opacity: 0, transform: "translateY(22px)" }, { opacity: 1, transform: "none" }], { duration: 650, delay: 300 });
  }, [heroKey]);
  useEffect(() => { if (!r && !cookTitle) screenAnim(rootRef.current); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (filtersOpen) openHeight(drawerRef.current, 520); }, [filtersOpen]);
  const fKey = JSON.stringify(k.filters);
  const firstF = useRef(true);
  useEffect(() => {
    if (firstF.current) { firstF.current = false; return; }
    stagger(rootRef.current, "[data-card]", [{ opacity: 0, transform: "scale(.94)" }, { opacity: 1, transform: "none" }], { duration: 450, step: 50 });
  }, [fKey]);

  const measureCat = useCallback(() => {
    const a = catRef.current?.querySelector('[data-active="1"]');
    setCatInd(a ? { left: a.offsetLeft, top: a.offsetTop, w: a.offsetWidth, h: a.offsetHeight } : null);
  }, []);
  useLayoutEffect(measureCat, [activeCat, measureCat]);
  useEffect(() => {
    window.addEventListener("resize", measureCat);
    document.fonts?.ready?.then(measureCat);
    return () => window.removeEventListener("resize", measureCat);
  }, [measureCat]);

  // ── derived ─────────────────────────────────────────────────────────────
  const f = k.filters;
  const fc = filterCount(f);
  const factor = r ? serves / (r.baseServes || serves) : 1;
  const ings = (r?.ings || []).map((g) => {
    const have = k.inPantry(g.name), shopped = !have && k.inShop(g.name);
    return { ...g, have, inShop: shopped, missing: !have && !shopped, amt: scaleAmount(g.amount, factor), subs: r.subs[g.name] || [] };
  });
  const haveCount = ings.filter((i) => i.have).length;
  const shownMatch = useTween(r ? matchOf(r, k.pantry) : 0);
  const leftovers = k.pantry.filter((p) => p.isLeftover);
  const cookNext = feed
    .filter((x) => passes(x, f))
    .map((x) => ({ x, soon: soonUses(x, k.pantry), match: matchOf(x, k.pantry) }))
    .sort((a, b) => b.soon.length - a.soon.length || b.match - a.match);
  const blocked = r && !passes(r, f);
  const alt = feed.find((x) => passes(x, f));
  const subHints = ings.filter((i) => !i.have && i.subs.length).slice(0, 3);
  const nutCells = r?.nut && r.cal != null
    ? [["Calories", r.cal, "kcal", r.cal / 2000], ["Protein", r.nut.protein, "g", r.nut.protein / 50], ["Carbs", r.nut.carbs, "g", r.nut.carbs / 260], ["Fat", r.nut.fat, "g", r.nut.fat / 70]]
    : [["Calories", "—", "", 0], ["Protein", "—", "", 0], ["Carbs", "—", "", 0], ["Fat", "—", "", 0]];
  const saved = r && k.isSaved(r.title);

  const toggleSave = () => {
    if (!r) return;
    k.toggleSave(r);
    anim(saveRef.current, [{ transform: "scale(1)" }, { transform: "scale(.82)" }, { transform: "scale(1.12)" }, { transform: "scale(1)" }], { duration: 500 });
  };
  const flyImg = (e) => e.currentTarget.closest("[data-fly]")?.querySelector("img");
  const goPricing = () => router.push("/#pricing");

  return (
    <div ref={rootRef} data-screen="1" style={{ display: "flex", flexDirection: "column", gap: 30 }}>
      <div data-fade="1" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h1 className="sv-h1">Fresh recipes, Servd daily</h1>
        <p className="sv-lead">Discover thousands of recipes from around the world. Cook, create, and savor.</p>
      </div>

      {leftovers.length > 0 && (
        <div data-fade="1" style={{ background: "#121212", color: "#fff", borderRadius: 26, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: "#FF5A5F" }}>Leftovers to finish</span>
            <span style={{ fontSize: 14, color: "#B9B9C0" }}>{leftovers.length} {leftovers.length === 1 ? "dish" : "dishes"}</span>
          </div>
          {leftovers.map((lo) => (
            <div key={lo.id} data-pid={lo.id} style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ width: 56, height: 56, flex: "none", borderRadius: "50%", overflow: "hidden", boxShadow: "0 0 0 3px rgba(255,255,255,.15)" }}><Img src={lo.imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>
              <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{lo.name} <span style={{ fontSize: 14, fontWeight: 600, color: "#B9B9C0" }}>· {lo.quantity}</span></div>
                <div style={{ fontSize: 15, color: "#B9B9C0", lineHeight: 1.45 }}>{lo.leftoverIdea}</div>
              </div>
              <span style={{ background: "#E11D24", color: "#fff", borderRadius: 999, padding: "5px 12px", fontSize: 13, fontWeight: 800 }}>{lo.days == null ? "Use soon" : lo.days <= 0 ? "Expired" : lo.days === 1 ? "Use today" : `Use in ${lo.days} days`}</span>
              <button onClick={(e) => k.removePantry(lo.id, e.currentTarget.closest("[data-pid]"))} style={{ height: 42, padding: "0 18px", border: 0, borderRadius: 999, background: "#fff", color: "#121212", fontSize: 15, fontWeight: 700 }}>Mark eaten</button>
            </div>
          ))}
        </div>
      )}

      {/* categories + filters */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div className="sv-section-title">Browse by category</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 14, fontWeight: 700, color: "#E11D24", textTransform: "uppercase", letterSpacing: ".06em" }}>
            {isRecipeOfDay && <><IconFlame />Recipe of the day</>}
            <button
              onClick={() => setFiltersOpen((o) => !o)}
              aria-expanded={filtersOpen}
              style={{ marginLeft: 10, display: "flex", alignItems: "center", gap: 8, height: 40, padding: fc ? "0 8px 0 16px" : "0 16px", borderRadius: 999, border: `1.5px ${filtersOpen || fc ? "solid #121212" : "dashed #C9C9D0"}`, background: filtersOpen ? "#121212" : "#fff", color: filtersOpen ? "#fff" : "#121212", fontSize: 14, fontWeight: 700, letterSpacing: ".04em", textTransform: "none", transition: "all .3s" }}
            >
              <IconFilter />Diet &amp; spice
              {fc > 0 && <span style={{ minWidth: 24, height: 24, padding: "0 6px", boxSizing: "border-box", borderRadius: 999, background: "#E11D24", color: "#fff", display: "grid", placeItems: "center", fontSize: 12 }}>{fc}</span>}
            </button>
          </div>
        </div>
        <div ref={catRef} style={{ position: "relative", display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ position: "absolute", zIndex: 1, left: catInd?.left || 0, top: catInd?.top || 0, width: catInd?.w || 0, height: catInd?.h || 0, background: "#121212", borderRadius: 999, opacity: catInd ? 1 : 0, transition: motionOff() ? "none" : `left .6s ${EASE}, top .6s ${EASE}, width .6s ${EASE}, height .6s ${EASE}` }} />
          {categories.map((c) => {
            const on = c === activeCat;
            return (
              <Link key={c} href={`/dashboard?cat=${encodeURIComponent(c)}`} scroll={false} data-active={on ? "1" : "0"} className="sv-cat" style={{ position: "relative", height: 46, padding: "0 24px", borderRadius: 999, background: "#fff", fontSize: 17, fontWeight: 500, display: "inline-flex", alignItems: "center" }}>
                <span style={{ position: "relative", zIndex: 2, color: on ? "#fff" : "#121212", transition: "color .35s" }}>{c}</span>
              </Link>
            );
          })}
        </div>
        {filtersOpen && (
          <div ref={drawerRef} style={{ overflow: "hidden" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 22, alignItems: "flex-start", padding: "18px 20px", borderRadius: 24, background: "#fff", border: "1.5px dashed #D2D2D8" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: "1 1 320px" }}>
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "#6A6A72" }}>Diet &amp; allergies</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {DIETS.map(([key, label]) => (
                    <button key={key} className="sv-chip-toggle" data-on={f[key] ? "1" : "0"} onClick={() => k.setFilters((cur) => { const nf = { ...cur, [key]: !cur[key] }; if (key === "vegan" && nf.vegan) nf.veg = true; return nf; })}>{label}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: "1 1 260px" }}>
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "#6A6A72" }}>Max spice</div>
                <div className="sv-seg">
                  {SPICE.map(([label, v]) => <button key={label} data-on={f.spice === v ? "1" : "0"} onClick={() => k.setFilters((cur) => ({ ...cur, spice: v }))} style={{ height: 36, fontSize: 14 }}>{label}</button>)}
                </div>
              </div>
              <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14, fontWeight: 600, color: "#6A6A72" }}>
                <span>{fc ? `${[r, ...feed].filter((x) => x && passes(x, f)).length} of ${[r, ...feed].filter(Boolean).length} recipes here match` : "Showing all recipes"}</span>
                <button className="sv-link-btn" onClick={() => k.setFilters(NO_FILTERS)}>Clear all</button>
              </div>
            </div>
          </div>
        )}
        {blocked && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "12px 12px 12px 18px", borderRadius: 18, border: "1.5px dashed #E11D24", background: "#fff", fontSize: 15, fontWeight: 600 }}>
            <span style={{ flex: 1 }}>{r.title} doesn&apos;t fit your filters · {blockReason(r, f)}</span>
            {alt && <button className="sv-btn-dark" onClick={() => router.push(heroHref(alt))} style={{ height: 38, padding: "0 16px", fontSize: 14, fontWeight: 700 }}>Show a match</button>}
          </div>
        )}
      </div>

      {/* hero */}
      {!r ? (
        cookTitle && !servdError ? <HeroSkeleton title={cookTitle} /> : (
          <div style={{ border: "1.5px dashed #E11D24", background: "#fff", borderRadius: 22, padding: 22, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ flex: 1, fontSize: 16, fontWeight: 600 }}>Couldn&apos;t load this recipe. Check your connection and try again.</span>
            <button className="sv-btn-dark" onClick={() => router.refresh()} style={{ height: 44, padding: "0 20px", fontSize: 15, fontWeight: 700 }}>Try again</button>
          </div>
        )
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 44, alignItems: "center", padding: "6px 0" }}>
          <div style={{ flex: "0 1 400px", minWidth: "min(260px, 100%)", aspectRatio: 1, position: "relative" }}>
            <Plate src={r.img} alt={r.title} />
            <div data-chip="1" className="sv-chip-float" style={{ left: -6, bottom: 34, display: "flex", alignItems: "center", gap: 10, padding: "8px 18px 8px 8px" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: `conic-gradient(#E11D24 ${shownMatch * 3.6}deg, #EDEDF0 0)`, display: "grid", placeItems: "center" }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#fff" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
                <span style={{ fontSize: 19, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{shownMatch}%</span>
                <span style={{ fontSize: 12, color: "#6A6A72", fontWeight: 600 }}>pantry match</span>
              </div>
            </div>
            <div data-chip="1" style={{ position: "absolute", right: 6, top: 30, background: "#121212", color: "#fff", borderRadius: 999, padding: "9px 16px", fontSize: 14, fontWeight: 700 }}>
              {r.cal != null ? `${r.cal} kcal` : r.analysed ? "Nutrition n/a" : "Analysing…"}
            </div>
          </div>

          <div style={{ flex: "1 1 340px", minWidth: 0, display: "flex", flexDirection: "column", gap: 22 }}>
            {fromExplore && (
              <Link data-fade="1" href={`/explore?area=${encodeURIComponent(r.cuisine)}`} className="sv-btn-ghost" style={{ alignSelf: "flex-start", height: 38, padding: "0 16px 0 10px", fontSize: 14, fontWeight: 700, gap: 8 }}>
                <IconArrowLeft size={14} sw={2.4} />More {r.cuisine} dishes
              </Link>
            )}
            <div data-fade="1" className="sv-eyebrow" style={{ letterSpacing: ".12em" }}>{r.cuisine} · {r.cat}</div>
            <h1 style={{ margin: "-10px 0 0", fontSize: "clamp(36px, 7vw, 58px)", lineHeight: 1.02, fontWeight: 700, letterSpacing: "-.04em" }} className="sv-words">
              {r.title.split(" ").map((w, i) => <span key={i} className="sv-word"><span data-w="1">{w}</span></span>)}
            </h1>
            {r.desc && <p data-fade="1" style={{ margin: "-8px 0 0", fontSize: 18, lineHeight: 1.5, color: "#3A3A40", maxWidth: 520, textWrap: "pretty" }}>{r.desc}</p>}
            <div data-fade="1" style={{ display: "flex", gap: 22, flexWrap: "wrap", fontSize: 16, fontWeight: 600, color: "#3A3A40" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 7 }}><IconClock />{fmtTime(r.time)}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 7 }}><IconPeople />{serves} servings</span>
            </div>

            <div data-fade="1" style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(104px, 1fr))", gap: 8, maxWidth: 520 }}>
              {nutCells.map(([label, val, unit, p]) => (
                <div key={label} style={{ background: "#fff", borderRadius: 16, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6, filter: k.isPro ? "none" : "blur(5px)", transition: "filter .5s" }} aria-hidden={!k.isPro}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "#6A6A72" }}>{label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.02em" }}>{val}<span style={{ fontSize: 13, fontWeight: 600, color: "#6A6A72" }}> {unit}</span></div>
                  <div style={{ height: 4, borderRadius: 4, background: "#EDEDF0", overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.min(100, Math.round(p * 100))}%`, background: "#E11D24", borderRadius: 4, transition: "width .8s cubic-bezier(.22,1,.36,1)" }} /></div>
                </div>
              ))}
              {!k.isPro && (
                <button className="sv-btn-dark" onClick={goPricing} style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", height: 42, padding: "0 18px", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", gap: 8, boxShadow: "0 12px 24px -12px rgba(0,0,0,.5)" }}>
                  <IconLock />Nutrition per serving · Pro
                </button>
              )}
            </div>

            <div data-fade="1" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="sv-eyebrow">Servings</div>
              <div style={{ display: "flex", gap: 10 }}>
                {[2, 4, 6].map((v) => (
                  <button key={v} onClick={() => setServes(v)} style={{ height: 46, minWidth: 76, padding: "0 18px", borderRadius: 999, border: v === serves ? "1.5px solid #121212" : "1.5px dashed #C9C9D0", background: v === serves ? "#121212" : "transparent", color: v === serves ? "#fff" : "#121212", fontSize: 17, fontWeight: 600, transition: "all .3s cubic-bezier(.22,1,.36,1)" }}>{v} ppl</button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div data-fade="1" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span className="sv-eyebrow">Ingredients · <span style={{ color: "#121212" }}>{haveCount} of {ings.length} in your pantry</span></span>
                {ings.some((i) => i.missing) && (
                  <button className="sv-link-btn" onClick={() => k.addToShop(ings.filter((i) => i.missing).map((i) => ({ name: i.name, quantity: i.amt, forRecipe: r.title })))}>+ Add missing to list</button>
                )}
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", paddingBottom: 12 }}>
                {ings.map((g) => (
                  <div key={g.name} data-tile="1" data-fly="1" title={`${g.name} · ${g.amt}`} className="sv-tile">
                    <Img ingredient={g.name} />
                    {g.have && <div className="sv-tile-badge" style={{ background: "#121212" }}><IconCheck /></div>}
                    {g.inShop && <div className="sv-tile-badge" title="On your shopping list" style={{ background: "#fff", border: "1.5px solid #121212" }}><IconList /></div>}
                    {g.missing && (
                      <button className="sv-tile-badge sv-tile-add" title="Add to shopping list" onClick={(e) => { e.stopPropagation(); k.addToShop([{ name: g.name, quantity: g.amt, forRecipe: r.title }], { srcImg: flyImg(e) }); }}>
                        <IconPlus />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {subHints.length > 0 && (
                <div data-fade="1" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {subHints.map((i) => (
                    <div key={i.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, color: "#3A3A40" }}>
                      <IconSwap stroke="#E11D24" style={{ flex: "none" }} />
                      <span><b style={{ color: "#121212" }}>No {i.name}?</b> Try {i.subs.join(" or ")}.</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div data-fade="1" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <button ref={saveRef} onClick={toggleSave} title={saved ? "Remove from My Recipes" : "Save to My Recipes"} className="sv-btn-ghost" style={{ width: 60, height: 60, flex: "none", padding: 0, borderRadius: "50%" }}>
                {k.savingKey === r.key ? <span className="sv-spin" style={{ width: 20, height: 20, borderRadius: "50%", border: "2.5px solid #E11D24", borderTopColor: "transparent" }} /> : <IconBookmark size={22} sw={1.9} fill={saved ? "#E11D24" : "none"} stroke={saved ? "#E11D24" : "#121212"} />}
              </button>
              <button onClick={() => setShareOpen(true)} title="Share or export" className="sv-btn-ghost" style={{ width: 60, height: 60, flex: "none", padding: 0, borderRadius: "50%" }}>
                <IconShare />
              </button>
              <button className="sv-btn-dark" onClick={() => router.push(`${cookHref(r.title)}&serves=${serves}${r.source === "mealdb" ? `&img=${encodeURIComponent(r.img)}` : ""}`)} style={{ flex: "1 1 280px", maxWidth: 420, height: 60, fontSize: 18, padding: "0 8px 0 30px", justifyContent: "flex-start", gap: 0 }}>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmtTime(r.time)}</span>
                <span style={{ width: 1, height: 26, background: "rgba(255,255,255,.25)", margin: "0 22px" }} />
                <span style={{ flex: 1, textAlign: "left" }}>Start cooking</span>
                <span style={{ width: 44, height: 44, borderRadius: "50%", background: "#E11D24", display: "grid", placeItems: "center" }}><IconArrowRight /></span>
              </button>
            </div>
          </div>
        </div>
      )}

      {cookNext.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="sv-eyebrow">Cook next</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(240px, 100%), 1fr))", gap: 14 }}>
            {cookNext.map(({ x, soon, match }) => (
              <Link key={x.key} href={heroHref(x)} data-card="1" className="sv-dash-card" style={{ position: "relative", display: "flex", alignItems: "center", gap: 16, padding: 14, borderRadius: 22 }}>
                <div style={{ width: 84, height: 84, flex: "none", borderRadius: "50%", overflow: "hidden", background: "#E8D6C3", boxShadow: "0 10px 20px -10px rgba(0,0,0,.4), 0 0 0 4px #fff" }}><Img src={thumb(x.img)} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, paddingRight: 30 }}>
                  <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.2, color: "#121212" }}>{x.title}</div>
                  <div style={{ fontSize: 14, color: "#6A6A72" }}>{fmtTime(x.time)}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#E11D24" }}>{match}% match</div>
                  {soon.length > 0 && <div style={{ alignSelf: "flex-start", marginTop: 2, background: "#121212", color: "#fff", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>Uses {soon.slice(0, 2).join(", ")} · expiring</div>}
                </div>
                <span style={{ position: "absolute", right: 14, bottom: 14, width: 30, height: 30, borderRadius: "50%", background: "#121212", display: "grid", placeItems: "center" }}><IconArrowRight size={14} sw={2.6} /></span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div className="sv-section-title">Explore world cuisines</div>
            <div style={{ fontSize: 16, color: "#6A6A72", marginTop: 2 }}>Travel the globe through food</div>
          </div>
          <Link href="/explore" className="sv-link-btn" style={{ fontSize: 15 }}>See all 29 cuisines →</Link>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {DASH_CUISINES.map((c) => (
            <Link key={c} href={`/explore?area=${c}`} data-card="1" className="sv-dash-card" style={{ display: "flex", alignItems: "center", gap: 10, height: 52, padding: "0 8px 0 20px", borderRadius: 999, fontSize: 16, fontWeight: 600, boxSizing: "border-box" }}>
              <span style={{ color: "#121212" }}>{c}</span>
              <span style={{ minWidth: 34, height: 34, padding: "0 8px", boxSizing: "border-box", borderRadius: 999, background: r?.cuisine === c ? "#E11D24" : "#121212", color: "#fff", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 800 }}>{findArea(c)?.code}</span>
            </Link>
          ))}
        </div>
      </div>

      {shareOpen && r && <ShareModal recipe={r} serves={serves} swaps={{}} onClose={() => setShareOpen(false)} />}
    </div>
  );
}

function HeroSkeleton({ title }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 44, alignItems: "center" }}>
      <div className="sv-skel" style={{ flex: "0 1 400px", minWidth: "min(260px, 100%)", aspectRatio: 1, borderRadius: "50%" }} />
      <div style={{ flex: "1 1 340px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="sv-eyebrow">Our AI chef is preparing</div>
        <div style={{ fontSize: "clamp(36px, 7vw, 58px)", fontWeight: 700, letterSpacing: "-.04em", lineHeight: 1.02 }}>{title}</div>
        <div className="sv-skel" style={{ height: 20, borderRadius: 10, maxWidth: 420 }} />
        <div className="sv-skel" style={{ height: 20, borderRadius: 10, maxWidth: 320 }} />
      </div>
    </div>
  );
}
