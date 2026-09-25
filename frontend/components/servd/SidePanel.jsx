"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useKitchen } from "./KitchenProvider";
import { screenOf } from "./AppShell";
import { Img } from "./Plate";
import { IconCheck, IconPlus, IconSwap, IconX } from "./icons";
import { cookHref, expLabel, fmtTime, listHas, matchOf, scaleAmount } from "@/lib/servd/recipe";
import { anim, openHeight, useTween } from "@/lib/servd/motion";

export default function SidePanel() {
  const screen = screenOf(usePathname());
  const { cook } = useKitchen();
  return (
    <aside className="sv-aside">
      {screen === "cook" && cook?.recipe ? <CookPanel /> : <PantryPanel screen={screen} />}
    </aside>
  );
}

function PantryPanel({ screen }) {
  const k = useKitchen();
  const router = useRouter();
  const { pantryListRef, shopListRef, countRef, shopCountRef } = k.refs;
  const panelRef = useRef(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    panelRef.current?.querySelectorAll("[data-panel]").forEach((e) => anim(e, [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 400 }));
  }, [k.panelTab]);

  const onPantry = k.panelTab === "pantry";
  const soon = k.pantry.filter((p) => p.days != null && p.days <= 3).length;
  const bought = k.shop.filter((s) => s.done).length;
  const r = k.current?.recipe;
  const have = r ? r.ings.filter((i) => listHas(k.pantry, i.name)).length : 0;
  const match = useTween(r ? matchOf(r, k.pantry) : 0);
  const shopText = encodeURIComponent("Servd shopping list:\n" + k.shop.map((x) => `• ${x.name}${x.quantity ? ` — ${x.quantity}` : ""}`).join("\n"));

  return (
    <div ref={panelRef} style={{ display: "contents" }}>
      <div className="sv-seg">
        <button data-on={onPantry ? "1" : "0"} onClick={() => k.setPanelTab("pantry")} style={{ height: 44, fontSize: 15, color: "#121212" }}>
          Pantry <span ref={countRef} style={{ display: "inline-block", color: "#6A6A72" }}>{k.pantry.length}</span>
        </button>
        <button data-on={!onPantry ? "1" : "0"} onClick={() => k.setPanelTab("shop")} style={{ height: 44, fontSize: 15, color: "#121212" }}>
          Shopping{" "}
          <span ref={shopCountRef} style={{ display: "inline-block", minWidth: 22, padding: "1px 7px", borderRadius: 999, background: k.shop.length ? "#E11D24" : "#D5D5DB", color: "#fff", boxSizing: "border-box" }}>
            {k.shop.length}
          </span>
        </button>
      </div>

      {onPantry ? (
        <>
          <div data-panel="1" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div className="sv-section-title">My Pantry</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: soon ? "#E11D24" : "#6A6A72" }}>
              {soon ? `${soon} expiring soon` : `${k.pantry.length} items`}
            </div>
          </div>
          <AddItemRow />
          <div ref={pantryListRef} style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 470, overflowY: "auto", margin: "0 -6px", padding: "2px 6px" }}>
            {!k.loaded && [0, 1, 2].map((i) => <div key={i} className="sv-skel" style={{ height: 76, borderRadius: 20 }} />)}
            {k.loaded && !k.pantry.length && (
              <div style={{ border: "1.5px dashed #D2D2D8", borderRadius: 20, padding: 24, fontSize: 15, lineHeight: 1.5, color: "#6A6A72" }}>
                Your pantry is empty. Scan your fridge or add an item above.
              </div>
            )}
            {k.pantry.map((p) => (
              <div key={p.id} data-pid={p.id} className="sv-row" style={{ opacity: p.pending ? 0.7 : 1 }}>
                <div style={{ width: 56, height: 56, flex: "none", borderRadius: "50%", overflow: "hidden", background: "#fff", display: "grid", placeItems: "center", boxShadow: "0 6px 14px -8px rgba(0,0,0,.25)" }}>
                  <Img {...(p.isLeftover && p.imageUrl ? { src: p.imageUrl } : { ingredient: p.name })} style={p.isLeftover ? { width: "100%", height: "100%", objectFit: "cover" } : { width: 42, height: 42, objectFit: "contain" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 600 }}>{p.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 14, color: "#6A6A72" }}>
                    {p.quantity}
                    {(p.days != null || !p.pending) && (
                      <span style={{ borderRadius: 999, padding: "2px 9px", fontSize: 12, fontWeight: 700, background: p.days != null && p.days <= 3 ? "#E11D24" : "#EDEDF0", color: p.days != null && p.days <= 3 ? "#fff" : "#6A6A72" }}>
                        {p.days == null ? "Checking…" : expLabel(p.days)}
                      </span>
                    )}
                  </div>
                </div>
                <button className="sv-circle-btn sv-x" title="Remove" onClick={(e) => k.removePantry(p.id, e.currentTarget.closest("[data-pid]"))}>
                  <IconX size={12} />
                </button>
              </div>
            ))}
          </div>
          {r && (
            <>
              <div className="sv-divider" />
              <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: 15, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span style={{ color: "#6A6A72" }}>Recipe</span><span style={{ textTransform: "none", letterSpacing: 0, textAlign: "right" }}>{r.title}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#6A6A72" }}>In pantry</span><span>{have} / {r.ings.length}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#6A6A72" }}>Missing</span><span style={{ color: "#E11D24" }}>{r.ings.length - have}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 17, fontWeight: 800 }}><span>Match</span><span style={{ fontSize: 24, fontVariantNumeric: "tabular-nums", letterSpacing: "-.02em" }}>{match}%</span></div>
              </div>
            </>
          )}
          <div style={{ flex: 1 }} />
          <button
            className="sv-btn-red"
            style={{ height: 64, fontSize: 19 }}
            onClick={() => (screen === "pantry" && r ? router.push(cookHref(r.title)) : router.push("/pantry"))}
          >
            {screen === "pantry" && r ? `Cook ${r.title.split(" ").slice(-1)[0]} now` : "Scan my fridge"}
          </button>
        </>
      ) : (
        <>
          <div data-panel="1" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div className="sv-section-title">Shopping list</div>
            <div style={{ fontSize: 14, color: "#6A6A72", fontWeight: 700 }}>{k.shop.length ? `${k.shop.length - bought} to buy` : "Empty"}</div>
          </div>
          <div ref={shopListRef} style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 470, overflowY: "auto", margin: "0 -6px", padding: "2px 6px" }}>
            {!k.shop.length && (
              <div style={{ border: "1.5px dashed #D2D2D8", borderRadius: 20, padding: 24, fontSize: 15, lineHeight: 1.5, color: "#6A6A72" }}>
                Nothing to buy yet. Tap the red + on a missing ingredient, or add a whole week from the Planner.
              </div>
            )}
            {k.shop.map((s) => (
              <div key={s.id} data-shid={s.id} className="sv-row" style={{ gap: 12, opacity: s.done ? 0.5 : 1 }}>
                <button className="sv-check" data-on={s.done ? "1" : "0"} title="Mark bought" onClick={() => k.toggleShop(s.id)}>
                  <IconCheck />
                </button>
                <div style={{ width: 46, height: 46, flex: "none", borderRadius: "50%", background: "#fff", display: "grid", placeItems: "center" }}>
                  <Img ingredient={s.name} style={{ width: 34, height: 34, objectFit: "contain" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, textDecoration: s.done ? "line-through" : "none" }}>{s.name}</div>
                  <div style={{ fontSize: 13, color: "#6A6A72" }}>{[s.quantity, s.forRecipe && `for ${s.forRecipe}`].filter(Boolean).join(" · ")}</div>
                </div>
                <button className="sv-circle-btn sv-x" title="Remove" onClick={(e) => k.removeShop(s.id, e.currentTarget.closest("[data-shid]"))}>
                  <IconX size={11} />
                </button>
              </div>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          {bought > 0 && (
            <button className="sv-btn-dark" style={{ height: 56, fontSize: 17, fontWeight: 700 }} onClick={k.moveBought}>
              Move {bought} bought to pantry
            </button>
          )}
          <a
            href={`https://wa.me/?text=${shopText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="sv-btn-red"
            style={{ height: 64, fontSize: 19, opacity: k.shop.length ? 1 : 0.45, pointerEvents: k.shop.length ? "auto" : "none" }}
          >
            Share list on WhatsApp
          </a>
        </>
      )}
    </div>
  );
}

// Manual add, kept from the original pantry page.
function AddItemRow() {
  const k = useKitchen();
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    k.addToPantry([{ name: name.trim().replace(/\b\w/g, (c) => c.toUpperCase()), quantity: qty.trim() }]);
    setName("");
    setQty("");
  };
  return (
    <form onSubmit={submit} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 6px 6px 16px", borderRadius: 999, border: "1.5px dashed #C9C9D0", background: "#fff" }}>
      <input className="sv-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Add an item" aria-label="Item name" style={{ fontSize: 15 }} />
      <input className="sv-input" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Qty" aria-label="Quantity" style={{ fontSize: 15, flex: "0 0 64px" }} />
      <button type="submit" title="Add to pantry" className="sv-circle-btn" style={{ background: name.trim() ? "#E11D24" : "#D5D5DB", width: 34, height: 34 }}>
        <IconPlus />
      </button>
    </form>
  );
}

function CookPanel() {
  const { cook, setCook } = useKitchen();
  const { recipe: r, serves, checked, swaps, swapOpen } = cook;
  const f = serves / (r.baseServes || serves);
  const done = Object.values(checked).filter(Boolean).length;
  const swapRef = useRef(null);
  useEffect(() => { if (swapOpen) openHeight(swapRef.current, 420); }, [swapOpen]);
  const upd = (patch) => setCook((c) => ({ ...c, ...(typeof patch === "function" ? patch(c) : patch) }));

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div className="sv-section-title">Ingredients</div>
        <div style={{ fontSize: 16, color: "#6A6A72", fontWeight: 600 }}>{serves} servings</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 560, overflowY: "auto", margin: "0 -6px", padding: "2px 6px" }}>
        {r.ings.map((g) => {
          const ck = !!checked[g.name], sw = swaps[g.name], open = swapOpen === g.name, subs = r.subs[g.name] || [];
          return (
            <div key={g.name} className="sv-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 0, padding: 0, borderRadius: 18, opacity: ck ? 0.45 : 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 10px 8px 8px" }}>
                <button className="sv-check" data-on={ck ? "1" : "0"} title="Mark prepped" onClick={() => upd((c) => ({ checked: { ...c.checked, [g.name]: !c.checked[g.name] } }))}>
                  <IconCheck />
                </button>
                <Img ingredient={g.name} style={{ width: 38, height: 38, objectFit: "contain" }} />
                <div onClick={() => upd((c) => ({ checked: { ...c.checked, [g.name]: !c.checked[g.name] } }))} style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
                  <div style={{ fontSize: 16, fontWeight: 600, textDecoration: ck ? "line-through" : "none" }}>{sw || g.name}</div>
                  {sw && <div style={{ fontSize: 12, fontWeight: 700, color: "#E11D24" }}>swapped for {g.name}</div>}
                </div>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#E11D24", whiteSpace: "nowrap", maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis" }}>{scaleAmount(g.amount, f)}</span>
                {subs.length > 0 && (
                  <button className="sv-circle-btn" title="Swap ingredient" onClick={() => upd((c) => ({ swapOpen: c.swapOpen === g.name ? null : g.name }))} style={{ background: open || sw ? "#121212" : "#EDEDF0", color: open || sw ? "#fff" : "#121212" }}>
                    <IconSwap size={14} sw={2.4} />
                  </button>
                )}
              </div>
              {open && (
                <div ref={swapRef} style={{ overflow: "hidden" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "0 12px 12px 46px" }}>
                    <span style={{ width: "100%", fontSize: 12, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "#6A6A72" }}>Swap with</span>
                    {[g.name, ...subs].map((alt) => {
                      const on = (sw || g.name) === alt;
                      return (
                        <button
                          key={alt}
                          onClick={() =>
                            upd((c) => {
                              const s = { ...c.swaps };
                              if (alt === g.name) delete s[g.name];
                              else s[g.name] = alt;
                              return { swaps: s, swapOpen: null };
                            })
                          }
                          style={{ height: 32, padding: "0 12px", borderRadius: 999, border: "1.5px solid #121212", background: on ? "#121212" : "#fff", color: on ? "#fff" : "#121212", fontSize: 13, fontWeight: 700 }}
                        >
                          {alt === g.name ? `${g.name} (original)` : alt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="sv-divider" />
      <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: 15, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#6A6A72" }}>Prepped</span><span>{done} / {r.ings.length}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#6A6A72" }}>Total time</span><span>{fmtTime(r.time)}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 17, fontWeight: 800 }}><span>Energy</span><span>{r.cal != null ? `${r.cal} kcal` : "Nutrition n/a"}</span></div>
      </div>
      <div style={{ flex: 1 }} />
      <button className="sv-btn-red" style={{ height: 64, fontSize: 19 }} onClick={() => cook.next?.()}>
        {cook.nextLabel || "Next step"}
      </button>
    </>
  );
}
