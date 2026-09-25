"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getSavedRecipes } from "@/actions/recipe.actions";
import { useKitchen } from "@/components/servd/KitchenProvider";
import { Img } from "@/components/servd/Plate";
import { IconX } from "@/components/servd/icons";
import { fromServd, listHas, passes, scaleAmount, thumb } from "@/lib/servd/recipe";
import { stagger, UP } from "@/lib/servd/motion";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MEALS = ["Lunch", "Dinner"];
const TODAY = DAYS[(new Date().getDay() + 6) % 7];

export default function PlannerPage() {
  const k = useKitchen();
  const rootRef = useRef(null);
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [pick, setPick] = useState(null);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    getSavedRecipes().then((d) => setSavedRecipes(d.recipes.map(fromServd))).catch(() => {});
    stagger(rootRef.current, "[data-fade]", UP(16), { duration: 650, delay: 80, step: 90 });
  }, []);

  // Tray: saved recipes, then ones you've opened recently.
  const tray = useMemo(() => {
    const out = [];
    [...savedRecipes, ...k.seen].forEach((r) => {
      if (!out.some((x) => x.title.toLowerCase() === r.title.toLowerCase()) && passes(r, k.filters)) out.push(r);
    });
    return out.slice(0, 18);
  }, [savedRecipes, k.seen, k.filters]);
  const byKey = (key) => tray.find((r) => r.key === key);

  const planned = Object.values(k.plan);
  const toBuy = [];
  planned.forEach((p) =>
    (p.ings || []).forEach((i) => {
      if (!listHas(k.pantry, i.name) && !listHas(k.shop, i.name) && !toBuy.some((t) => t.name.toLowerCase() === i.name.toLowerCase()))
        toBuy.push({ name: i.name, quantity: scaleAmount(i.amount, 1), forRecipe: p.title });
    })
  );

  const place = (slot, id) => {
    if (!id) return;
    setHover(null);
    if (id.startsWith("move:")) return k.placeInSlot(slot, id);
    const r = byKey(id);
    if (r) k.placeInSlot(slot, r);
  };
  const clickCell = (slot) => {
    if (pick) { place(slot, pick); setPick(null); }
  };

  const cell = (d, meal, compact) => {
    const slot = `${d}-${meal}`, x = k.plan[slot], h = hover === slot;
    return (
      <div
        key={slot}
        data-cell={slot}
        onDragOver={(e) => { e.preventDefault(); if (hover !== slot) setHover(slot); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget) && hover === slot) setHover(null); }}
        onDrop={(e) => { e.preventDefault(); place(slot, e.dataTransfer.getData("text/plain")); }}
        onClick={() => clickCell(slot)}
        style={{
          position: "relative", minHeight: compact ? 112 : 130, boxSizing: "border-box", borderRadius: compact ? 18 : 20,
          border: `1.5px dashed ${h ? "#E11D24" : x ? "transparent" : pick && compact ? "#E11D24" : "#D2D2D8"}`,
          background: h ? "#FDECEC" : x ? "#fff" : "transparent",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: compact ? 6 : 8,
          padding: compact ? "26px 8px 10px" : "12px 8px", textAlign: "center", cursor: pick ? "pointer" : "default",
          transition: "background .25s, border-color .25s",
        }}
      >
        {compact && <span style={{ position: "absolute", left: 12, top: 9, fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "#6A6A72" }}>{meal}</span>}
        {x ? (
          <>
            <div data-cellinner="1" draggable={!compact} onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.setData("text/plain", "move:" + slot); }} style={{ width: compact ? 54 : 62, height: compact ? 54 : 62, borderRadius: "50%", overflow: "hidden", boxShadow: "0 8px 16px -8px rgba(0,0,0,.45), 0 0 0 3px #fff", cursor: compact ? "default" : "grab" }}>
              <Img src={thumb(x.img)} loading="lazy" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>{x.title}</div>
            <button onClick={(e) => { e.stopPropagation(); k.removeSlot(slot); }} title="Remove" className="sv-circle-btn sv-x sv-plan-x" style={{ position: "absolute", top: compact ? 4 : 6, right: compact ? 4 : 6 }}>
              <IconX size={10} sw={3.2} />
            </button>
          </>
        ) : (
          <span style={{ fontSize: 13, fontWeight: 600, color: "#9A9AA2" }}>{compact ? (pick ? "Tap to place" : "Pick a recipe above") : pick ? "Place here" : "Drop a recipe"}</span>
        )}
      </div>
    );
  };

  return (
    <div ref={rootRef} data-screen="1" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div data-fade="1" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 className="sv-h2" style={{ letterSpacing: "-.045em" }}>Weekly meal planner</h1>
            <span style={{ background: "#E11D24", color: "#fff", borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 800, letterSpacing: ".08em" }}>PRO</span>
          </div>
          <p className="sv-lead" style={{ marginTop: 6 }}>Drag recipes onto your week, or tap a recipe and then tap a slot.</p>
        </div>
        <button onClick={k.clearPlan} className="sv-btn-ghost" style={{ height: 46, padding: "0 20px", fontSize: 15 }}>Clear week</button>
      </div>

      {!k.isPro && (
        <div data-fade="1" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", padding: "14px 14px 14px 20px", borderRadius: 20, background: "#121212", color: "#fff" }}>
          <span style={{ flex: 1, fontSize: 16, fontWeight: 600 }}>You&apos;re previewing a Pro feature. Plans stay while you try it.</span>
          <Link href="/#pricing" className="sv-btn-red" style={{ height: 42, padding: "0 18px", fontSize: 15 }}>Upgrade to Pro</Link>
        </div>
      )}

      <div data-fade="1" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="sv-eyebrow">Your recipes · {pick ? "tap a slot to place it" : <><span className="sv-hide-compact">drag or tap to pick</span><span className="sv-only-compact">tap one to pick</span></>}</div>
        {tray.length === 0 && (
          <div style={{ border: "1.5px dashed #D2D2D8", borderRadius: 20, padding: 20, fontSize: 15, color: "#6A6A72" }}>
            Save recipes or open a few on the <Link href="/dashboard">Dashboard</Link> and they&apos;ll appear here to plan with.
          </div>
        )}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {tray.map((t) => {
            const on = pick === t.key;
            return (
              <div
                key={t.key}
                draggable
                onDragStart={(e) => { e.dataTransfer.setData("text/plain", t.key); e.dataTransfer.effectAllowed = "copyMove"; }}
                onClick={() => setPick(on ? null : t.key)}
                className="sv-tray"
                style={{ display: "flex", alignItems: "center", gap: 10, height: 56, padding: "0 18px 0 6px", borderRadius: 999, background: on ? "#121212" : "#fff", color: on ? "#fff" : "#121212", border: `1.5px solid ${on ? "#121212" : "#E1E1E6"}`, fontSize: 15, fontWeight: 600, cursor: "grab", userSelect: "none" }}
              >
                <Img src={thumb(t.img)} loading="lazy" draggable={false} style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }} />
                {t.title}
              </div>
            );
          })}
        </div>
      </div>

      <div data-fade="1" className="sv-hide-compact" style={{ overflowX: "auto", margin: "0 -4px", padding: 4 }}>
        <div style={{ display: "grid", gridTemplateColumns: "76px repeat(7, minmax(110px, 1fr))", gap: 10, minWidth: 880 }}>
          <div />
          {DAYS.map((d) => <div key={d} style={{ textAlign: "center", fontSize: 13, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: d === TODAY ? "#E11D24" : "#6A6A72" }}>{d === TODAY ? `${d} · today` : d}</div>)}
          {MEALS.map((meal) => [
            <div key={meal} style={{ alignSelf: "center", fontSize: 15, fontWeight: 700 }}>{meal}</div>,
            ...DAYS.map((d) => cell(d, meal, false)),
          ])}
        </div>
      </div>
      <div className="sv-only-compact">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {DAYS.map((d) => (
            <div key={d} style={{ border: "1.5px dashed #D2D2D8", borderRadius: 22, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: d === TODAY ? "#E11D24" : "#121212" }}>{d === TODAY ? `${d} · today` : d}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{MEALS.map((meal) => cell(d, meal, true))}</div>
            </div>
          ))}
        </div>
      </div>

      <div data-fade="1" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap", padding: "16px 16px 16px 22px", borderRadius: 22, border: "1.5px dashed #D2D2D8" }}>
        <div style={{ fontSize: 17, fontWeight: 600 }}>
          <b>{planned.length}</b> meals planned · <span style={{ color: "#E11D24", fontWeight: 700 }}>{toBuy.length} ingredients</span> to buy
        </div>
        <button className="sv-btn-dark" onClick={() => k.addToShop(toBuy)} disabled={!toBuy.length} style={{ height: 52, padding: "0 22px", fontSize: 16, opacity: toBuy.length ? 1 : 0.45 }}>Add all to shopping list</button>
      </div>
    </div>
  );
}
