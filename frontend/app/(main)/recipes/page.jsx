"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { getSavedRecipes, unsaveRecipeByTitle } from "@/actions/recipe.actions";
import { useKitchen } from "@/components/servd/KitchenProvider";
import { Img } from "@/components/servd/Plate";
import { IconBookmark } from "@/components/servd/icons";
import { fmtTime, fromServd, heroHref } from "@/lib/servd/recipe";
import { slideOut, stagger, UP } from "@/lib/servd/motion";

export default function SavedRecipesPage() {
  const { forgetSaved } = useKitchen();
  const rootRef = useRef(null);
  const [recipes, setRecipes] = useState(null);

  useEffect(() => {
    getSavedRecipes()
      .then((d) => setRecipes(d.recipes.map(fromServd)))
      .catch((e) => {
        toast.error(e.message || "Couldn't load your saved recipes");
        setRecipes([]);
      });
  }, []);

  useEffect(() => {
    if (recipes === null) return;
    stagger(rootRef.current, "[data-fade]", UP(16), { duration: 650, step: 90 });
    stagger(rootRef.current, "[data-card]", UP(22), { duration: 650, delay: 300, step: 70 });
  }, [recipes === null]); // eslint-disable-line react-hooks/exhaustive-deps

  const unsave = (r, el) => {
    slideOut(el, () => setRecipes((cur) => cur.filter((x) => x.key !== r.key)), [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.92)" }]);
    forgetSaved(r.title);
    unsaveRecipeByTitle(r.title).catch((e) => {
      toast.error(e.message || "Couldn't remove that recipe");
      setRecipes((cur) => [r, ...cur]);
    });
  };

  return (
    <div ref={rootRef} data-screen="1" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div data-fade="1" style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <span style={{ width: 72, height: 72, flex: "none", borderRadius: "50%", background: "#E11D24", display: "grid", placeItems: "center" }}>
          <IconBookmark size={30} fill="#fff" stroke="#fff" sw={0} />
        </span>
        <div>
          <h1 className="sv-h1" style={{ letterSpacing: "-.04em" }}>My Saved Recipes</h1>
          <p className="sv-lead" style={{ marginTop: 4 }}>Your personal collection of favourite recipes</p>
        </div>
      </div>

      {recipes === null && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(360px, 100%), 1fr))", gap: 16 }}>
          {[0, 1].map((i) => <div key={i} className="sv-skel" style={{ height: 178, borderRadius: 26 }} />)}
        </div>
      )}

      {recipes?.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(360px, 100%), 1fr))", gap: 16 }}>
          {recipes.map((r) => (
            <div key={r.key} data-card="1" className="sv-dash-card" style={{ position: "relative", display: "flex", gap: 20, padding: 14, borderRadius: 26 }}>
              <Link href={heroHref(r)} style={{ width: "clamp(96px, 26vw, 150px)", height: "clamp(96px, 26vw, 150px)", flex: "none", borderRadius: 20, overflow: "hidden", background: "#E8D6C3" }}>
                <Img src={r.img} alt={r.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </Link>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8, padding: "4px 36px 4px 0" }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ border: "1.5px solid #E11D24", color: "#E11D24", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{r.cuisine}</span>
                  <span style={{ border: "1.5px solid #D2D2D8", color: "#3A3A40", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{r.cat}</span>
                </div>
                <Link href={heroHref(r)} style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.02em", color: "#121212", lineHeight: 1.15 }}>{r.title}</Link>
                <div className="sv-clamp2" style={{ fontSize: 15, lineHeight: 1.45, color: "#3A3A40" }}>{r.desc}</div>
                <div style={{ display: "flex", gap: 16, fontSize: 14, fontWeight: 600, color: "#6A6A72", marginTop: "auto" }}>
                  <span>{fmtTime(r.time)}</span>
                  <span>{r.cal != null ? `${r.cal} kcal` : `${r.ings.length} ingredients`}</span>
                </div>
              </div>
              <button onClick={(e) => unsave(r, e.currentTarget.closest("[data-card]"))} title="Remove from collection" className="sv-unsave" style={{ position: "absolute", top: 14, right: 14, width: 36, height: 36, padding: 0, border: 0, borderRadius: "50%", background: "#fff", display: "grid", placeItems: "center", boxShadow: "0 4px 12px -6px rgba(0,0,0,.3)" }}>
                <IconBookmark size={16} fill="#E11D24" stroke="#E11D24" sw={1.9} />
              </button>
            </div>
          ))}
        </div>
      )}

      {recipes?.length === 0 && (
        <div data-fade="1" style={{ border: "1.5px dashed #D2D2D8", borderRadius: 30, padding: "60px 30px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <span style={{ width: 76, height: 76, borderRadius: "50%", background: "#fff", display: "grid", placeItems: "center" }}>
            <IconBookmark size={30} stroke="#E11D24" sw={1.9} />
          </span>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-.02em" }}>No saved recipes yet</div>
          <p style={{ margin: 0, fontSize: 17, color: "#3A3A40", maxWidth: 420 }}>Start exploring recipes and save your favourites to build your personal cookbook.</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 6 }}>
            <Link href="/dashboard" className="sv-btn-dark" style={{ height: 54, padding: "0 26px", fontSize: 16 }}>Explore Recipes</Link>
            <Link href="/pantry" className="sv-btn-ghost" style={{ height: 54, padding: "0 26px", fontSize: 16 }}>Check Your Pantry</Link>
          </div>
        </div>
      )}
    </div>
  );
}
