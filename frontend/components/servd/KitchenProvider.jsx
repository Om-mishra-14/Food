"use client";
// App-wide state for signed-in users: pantry, shopping list, weekly plan, saved
// recipes, diet filters and the current cook session. Mutations update the UI
// straight away and sync to Strapi through server actions.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast as sonner } from "sonner";
import { useAuth } from "@clerk/nextjs";
import { getKitchenState, refreshAccount, addShoppingItems, setShoppingItemDone, removeShoppingItem, setPlanSlot, clearPlanSlot, clearPlan as clearPlanAction, saveDietPreferences } from "@/actions/kitchen.actions";
import { addPantryItems, deletePantryItem, fillMissingExpiry, saveLeftover as saveLeftoverAction } from "@/actions/pantry.actions";
import { saveRecipeByTitle, unsaveRecipeByTitle } from "@/actions/recipe.actions";
import { daysUntil, listHas, NO_FILTERS, sameIngredient } from "@/lib/servd/recipe";
import { anim, BUMP, flyTo, slideOut } from "@/lib/servd/motion";

const Ctx = createContext(null);
export const useKitchen = () => useContext(Ctx);

const withDays = (p) => ({ ...p, days: daysUntil(p.expiresAt) });
const tmpId = () => "tmp" + Date.now() + Math.floor(Math.random() * 1e5);
const lc = (s) => String(s || "").toLowerCase();
const raf2 = (cb) => requestAnimationFrame(() => requestAnimationFrame(cb));
const snapshot = (r) => ({ key: r.key, source: r.source, mealId: r.mealId || null, title: r.title, img: r.img, ings: (r.ings || []).map((i) => ({ name: i.name, amount: i.amount })) });

export default function KitchenProvider({ children }) {
  // Clerk knows who is signed in without a server round trip.
  const { isLoaded: authLoaded, isSignedIn, userId } = useAuth();
  const signedIn = !!isSignedIn;
  const [isPro, setIsPro] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [pantry, setPantry] = useState([]);
  const [shop, setShop] = useState([]);
  const [plan, setPlan] = useState({});
  const [saved, setSaved] = useState(() => new Set());
  const [savingKey, setSavingKey] = useState(null);
  const [filters, setFiltersState] = useState(NO_FILTERS);
  const [panelTab, setPanelTab] = useState("pantry");
  const [toastMsg, setToastMsg] = useState(null);
  const [current, setCurrentState] = useState(null); // { recipe, serves }
  const [seen, setSeen] = useState([]);
  const [cook, setCook] = useState(null); // cook session, see recipe page

  const pantryListRef = useRef(null), shopListRef = useRef(null), countRef = useRef(null), shopCountRef = useRef(null);
  const toastTimer = useRef(null), prefTimer = useRef(null);

  const showToast = useCallback((msg) => {
    clearTimeout(toastTimer.current);
    setToastMsg(msg);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2200);
  }, []);
  const fail = useCallback((e, fallback) => sonner.error(e?.message || fallback), []);

  // ── load ──────────────────────────────────────────────────────────────
  const apply = useCallback((s) => {
    setIsPro(!!s.isPro);
    setPantry(s.pantry.map(withDays));
    setShop(s.shop);
    setPlan(Object.fromEntries(s.plan.map((e) => [e.slot, e])));
    setSaved(new Set(s.savedTitles.map(lc)));
    if (s.preferences?.diet) setFiltersState({ ...NO_FILTERS, ...s.preferences.diet });
  }, []);

  const refresh = useCallback(async (fetcher = getKitchenState) => {
    try {
      const s = await fetcher();
      if (!s.signedIn) return;
      try { sessionStorage.setItem(`servd-kitchen:${userId}`, JSON.stringify(s)); } catch {}
      apply(s);
      if (s.pantry.some((p) => !p.expiresAt && !p.isLeftover)) {
        fillMissingExpiry()
          .then((r) => {
            const byId = Object.fromEntries(r.items.map((i) => [i.id, withDays(i)]));
            setPantry((cur) => cur.map((p) => byId[p.id] || p));
          })
          .catch(() => {});
      }
    } catch (e) {
      fail(e, "Couldn't load your kitchen");
    } finally {
      setLoaded(true);
    }
  }, [fail, apply, userId]);

  // Load when Clerk reports a signed-in user (including right after signing in
  // in the modal). Show the last known state from this tab instantly, then
  // refresh it in the background.
  useEffect(() => {
    if (!authLoaded) return;
    if (!isSignedIn) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset on sign-out
      setLoaded(true);
      setIsPro(false);
      setPantry([]);
      setShop([]);
      setPlan({});
      setSaved(new Set());
      return;
    }
    try {
      const cached = sessionStorage.getItem(`servd-kitchen:${userId}`);
      if (cached) {
        apply(JSON.parse(cached));
        setLoaded(true);
      }
    } catch {}
    refresh();
  }, [authLoaded, isSignedIn, userId, apply, refresh]);

  // Wake the Strapi backend (Render free tier sleeps) as soon as anyone
  // opens the app, so it's ready by the time sign-in finishes.
  useEffect(() => {
    const url = (process.env.NEXT_PUBLIC_STRAPI_URL || "https://food-backend-e25g.onrender.com").replace(/\/$/, "");
    fetch(`${url}/_health`, { mode: "no-cors", cache: "no-store" }).catch(() => {});
  }, []);

  useEffect(() => {
    try {
      // localStorage is only readable after hydration
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSeen(JSON.parse(localStorage.getItem("servd-seen") || "[]"));
    } catch {}
  }, []);

  // ── helpers ───────────────────────────────────────────────────────────
  const inPantry = useCallback((name) => listHas(pantry, name), [pantry]);
  const inShop = useCallback((name) => listHas(shop, name), [shop]);
  const isSaved = useCallback((title) => saved.has(lc(title)), [saved]);

  const ensureTab = useCallback((tab, cb) => {
    setPanelTab(tab);
    raf2(cb);
  }, []);

  // ── pantry ────────────────────────────────────────────────────────────
  // items: [{ name, quantity, shelfLifeDays? }]; srcImg: element to fly from
  const addToPantry = useCallback(
    (items, { srcImg, silent } = {}) => {
      const fresh = items.filter((i) => i?.name && !listHas(pantry, i.name));
      if (!fresh.length) return;
      const temps = fresh.map((i) => ({ id: tmpId(), name: i.name, quantity: i.quantity || "", expiresAt: null, days: i.shelfLifeDays ?? null, isLeftover: false, pending: true }));
      const land = () => {
        setPantry((cur) => [...temps.filter((t) => !listHas(cur, t.name)), ...cur]);
        setShop((cur) => cur.filter((s) => !fresh.some((f) => sameIngredient(f.name, s.name))));
        raf2(() => {
          if (pantryListRef.current) pantryListRef.current.scrollTop = 0;
          temps.forEach((t, i) => anim(document.querySelector(`[data-pid="${t.id}"]`), [{ opacity: 0, transform: "translateX(30px) scale(.92)" }, { opacity: 1, transform: "none" }], { duration: 650, delay: i * 80 }));
          anim(countRef.current, [{ transform: "scale(1)" }, { transform: "scale(1.3)", color: "#E11D24" }, { transform: "scale(1)" }], { duration: 500 });
        });
      };
      const msg = fresh.length === 1 ? `${fresh[0].name} added to pantry` : `${fresh.length} items added to pantry`;
      if (srcImg && fresh.length === 1) ensureTab("pantry", () => { if (!flyTo(srcImg, pantryListRef.current, land)) showToast(msg); });
      else { setPanelTab("pantry"); land(); if (!silent) showToast(msg); }

      // bought items leave the shopping list on the server too
      shop.filter((s) => fresh.some((f) => sameIngredient(f.name, s.name))).forEach((s) => removeShoppingItem(s.id).catch(() => {}));
      addPantryItems(fresh)
        .then((r) => {
          const real = r.items.map(withDays);
          setPantry((cur) => {
            const rest = cur.filter((p) => !temps.some((t) => t.id === p.id));
            return [...real, ...rest];
          });
        })
        .catch((e) => {
          setPantry((cur) => cur.filter((p) => !temps.some((t) => t.id === p.id)));
          fail(e, "Couldn't add to your pantry");
        });
    },
    [pantry, shop, ensureTab, showToast, fail]
  );

  const removePantry = useCallback(
    (id, el) => {
      const item = pantry.find((p) => p.id === id);
      slideOut(el, () => setPantry((cur) => cur.filter((p) => p.id !== id)));
      if (!item || item.pending) return;
      deletePantryItem(id).catch((e) => {
        setPantry((cur) => [item, ...cur]);
        fail(e, "Couldn't remove that item");
      });
    },
    [pantry, fail]
  );

  const saveLeftover = useCallback(
    async ({ title, portions, imageUrl, idea }) => {
      try {
        const r = await saveLeftoverAction({ title, portions, imageUrl, idea });
        setPantry((cur) => [withDays(r.item), ...cur]);
        return true;
      } catch (e) {
        fail(e, "Couldn't save leftovers");
        return false;
      }
    },
    [fail]
  );

  // ── shopping list ─────────────────────────────────────────────────────
  // items: [{ name, quantity, forRecipe }]
  const addToShop = useCallback(
    (items, { srcImg } = {}) => {
      const fresh = [];
      items.forEach((it) => {
        if (it?.name && !listHas(pantry, it.name) && !listHas(shop, it.name) && !fresh.some((f) => sameIngredient(f.name, it.name))) fresh.push(it);
      });
      if (!fresh.length) return;
      const temps = fresh.map((i) => ({ id: tmpId(), name: i.name, quantity: i.quantity || "", forRecipe: i.forRecipe || "", done: false, pending: true }));
      const land = () => {
        setShop((cur) => [...temps, ...cur]);
        raf2(() => {
          if (shopListRef.current) shopListRef.current.scrollTop = 0;
          temps.forEach((t, i) => anim(document.querySelector(`[data-shid="${t.id}"]`), [{ opacity: 0, transform: "translateX(30px) scale(.92)" }, { opacity: 1, transform: "none" }], { duration: 600, delay: i * 70 }));
          anim(shopCountRef.current, BUMP, { duration: 500 });
        });
      };
      const msg = fresh.length === 1 ? `${fresh[0].name} added to shopping list` : `${fresh.length} items added to shopping list`;
      if (srcImg && fresh.length === 1) ensureTab("shop", () => { if (!flyTo(srcImg, shopListRef.current, land)) showToast(msg); });
      else {
        setPanelTab("shop");
        land();
        if (typeof window !== "undefined" && window.innerWidth < 820) showToast(msg);
      }
      addShoppingItems(fresh)
        .then((r) => setShop((cur) => [...r.items, ...cur.filter((s) => !temps.some((t) => t.id === s.id))]))
        .catch((e) => {
          setShop((cur) => cur.filter((s) => !temps.some((t) => t.id === s.id)));
          fail(e, "Couldn't update your shopping list");
        });
    },
    [pantry, shop, ensureTab, showToast, fail]
  );

  const toggleShop = useCallback(
    (id) => {
      const item = shop.find((s) => s.id === id);
      if (!item) return;
      setShop((cur) => cur.map((s) => (s.id === id ? { ...s, done: !s.done } : s)));
      if (item.pending) return;
      setShoppingItemDone(id, !item.done).catch((e) => {
        setShop((cur) => cur.map((s) => (s.id === id ? { ...s, done: item.done } : s)));
        fail(e, "Couldn't update that item");
      });
    },
    [shop, fail]
  );

  const removeShop = useCallback(
    (id, el) => {
      const item = shop.find((s) => s.id === id);
      slideOut(el, () => setShop((cur) => cur.filter((s) => s.id !== id)));
      if (!item || item.pending) return;
      removeShoppingItem(id).catch((e) => {
        setShop((cur) => [item, ...cur]);
        fail(e, "Couldn't remove that item");
      });
    },
    [shop, fail]
  );

  const moveBought = useCallback(() => {
    const bought = shop.filter((s) => s.done);
    if (!bought.length) return;
    setShop((cur) => cur.filter((s) => !s.done));
    bought.forEach((b) => !b.pending && removeShoppingItem(b.id).catch(() => {}));
    addToPantry(bought.map((b) => ({ name: b.name, quantity: b.quantity })), { silent: true });
  }, [shop, addToPantry]);

  // ── planner ───────────────────────────────────────────────────────────
  const placeInSlot = useCallback(
    (slot, recipeOrMove) => {
      let recipe = recipeOrMove;
      const next = { ...plan };
      if (typeof recipeOrMove === "string" && recipeOrMove.startsWith("move:")) {
        const from = recipeOrMove.slice(5);
        if (from === slot || !plan[from]) return;
        recipe = plan[from];
        delete next[from];
        clearPlanSlot(from).catch(() => {});
      }
      if (!recipe?.title) return;
      const snap = { ...snapshot(recipe), slot, id: null };
      next[slot] = snap;
      setPlan(next);
      raf2(() => anim(document.querySelector(`[data-cell="${slot}"] [data-cellinner]`), [{ transform: "scale(.3) rotate(-90deg)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 600, easing: "cubic-bezier(.34,1.56,.64,1)" }));
      setPlanSlot(slot, snap).catch((e) => fail(e, "Couldn't save your plan"));
    },
    [plan, fail]
  );
  const removeSlot = useCallback(
    (slot) => {
      setPlan((cur) => {
        const n = { ...cur };
        delete n[slot];
        return n;
      });
      clearPlanSlot(slot).catch((e) => fail(e, "Couldn't update your plan"));
    },
    [fail]
  );
  const clearPlan = useCallback(() => {
    setPlan({});
    clearPlanAction().catch((e) => fail(e, "Couldn't clear your plan"));
  }, [fail]);

  // ── saved recipes ─────────────────────────────────────────────────────
  const toggleSave = useCallback(
    async (recipe) => {
      const t = lc(recipe.title);
      if (savingKey) return;
      const was = saved.has(t);
      setSaved((cur) => {
        const n = new Set(cur);
        was ? n.delete(t) : n.add(t);
        return n;
      });
      setSavingKey(recipe.key);
      try {
        if (was) await unsaveRecipeByTitle(recipe.title);
        else {
          await saveRecipeByTitle(recipe.title, recipe.source === "mealdb" ? recipe.img : "");
          showToast("Saved to My Recipes");
        }
      } catch (e) {
        setSaved((cur) => {
          const n = new Set(cur);
          was ? n.add(t) : n.delete(t);
          return n;
        });
        fail(e, "Couldn't update your saved recipes");
      } finally {
        setSavingKey(null);
      }
    },
    [saved, savingKey, showToast, fail]
  );
  const forgetSaved = useCallback((title) => setSaved((cur) => { const n = new Set(cur); n.delete(lc(title)); return n; }), []);

  // ── filters ───────────────────────────────────────────────────────────
  const setFilters = useCallback((f) => {
    setFiltersState((cur) => {
      const next = typeof f === "function" ? f(cur) : f;
      clearTimeout(prefTimer.current);
      prefTimer.current = setTimeout(() => saveDietPreferences(next).catch(() => {}), 800);
      return next;
    });
  }, []);

  // After a Pro payment: show Pro straight away, then re-read the account.
  const afterUpgrade = useCallback(() => {
    setIsPro(true);
    refresh(refreshAccount);
  }, [refresh]);

  // ── current recipe & history ──────────────────────────────────────────
  const setCurrent = useCallback((recipe, serves) => {
    setCurrentState(recipe ? { recipe, serves: serves || 2 } : null);
    if (!recipe) return;
    setSeen((cur) => {
      const next = [snapshot(recipe), ...cur.filter((x) => x.key !== recipe.key)].slice(0, 16);
      try { localStorage.setItem("servd-seen", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      signedIn, isPro, setIsPro, afterUpgrade, loaded, refresh,
      pantry, shop, plan, filters, setFilters, panelTab, setPanelTab,
      toast: toastMsg, showToast,
      current, setCurrent, seen, cook, setCook,
      inPantry, inShop, isSaved, savingKey,
      addToPantry, removePantry, saveLeftover,
      addToShop, toggleShop, removeShop, moveBought,
      placeInSlot, removeSlot, clearPlan,
      toggleSave, forgetSaved,
      refs: { pantryListRef, shopListRef, countRef, shopCountRef },
    }),
    [signedIn, isPro, afterUpgrade, loaded, refresh, pantry, shop, plan, filters, setFilters, panelTab, toastMsg, showToast, current, setCurrent, seen, cook, inPantry, inShop, isSaved, savingKey, addToPantry, removePantry, saveLeftover, addToShop, toggleShop, removeShop, moveBought, placeInSlot, removeSlot, clearPlan, toggleSave, forgetSaved]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
