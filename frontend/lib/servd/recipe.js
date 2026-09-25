// Shared (client + server) helpers for the Servd redesign: one recipe shape for
// TheMealDB meals and Servd AI recipes, plus formatting and pantry matching.

export const MEALDB_API = "https://www.themealdb.com/api/json/v1/1";
export const ingImg = (n) =>
  `https://www.themealdb.com/images/ingredients/${encodeURIComponent(n)}-Small.png`;

export const FALLBACK_IMG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#E8D6C3"/><circle cx="100" cy="100" r="58" fill="none" stroke="#C9A98A" stroke-width="6"/><circle cx="100" cy="100" r="38" fill="none" stroke="#C9A98A" stroke-width="3" stroke-dasharray="6 8"/></svg>'
  );

export const fmtTime = (t) =>
  t == null ? "—" : t < 60 ? `${t} min` : `${Math.floor(t / 60)}h ${t % 60 ? `${t % 60}m` : ""}`.trim();
export const fmtClock = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + (dateStr.length === 10 ? "T00:00:00" : ""));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}
export const expLabel = (d) =>
  d == null ? "No date" : d <= 0 ? "Expired" : d === 1 ? "Use today" : d <= 3 ? `Use in ${d} days` : `${d} days left`;

// ── ingredient name matching ────────────────────────────────────────────────
export function normName(n) {
  return String(n || "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\b(fresh|chopped|sliced|diced|large|small|medium|whole|ground|dried|raw|organic|leftover)\b/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length > 3 && w.endsWith("es") && !w.endsWith("ses") ? w.slice(0, -2) : w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w))
    .join(" ")
    .trim();
}
export function sameIngredient(a, b) {
  const x = normName(a), y = normName(b);
  if (!x || !y) return false;
  if (x === y) return true;
  if (x.length < 3 || y.length < 3) return false;
  return (` ${x} `).includes(` ${y} `) || (` ${y} `).includes(` ${x} `);
}
export const listHas = (list, name) => list.some((p) => sameIngredient(p.name, name));
export function matchOf(recipe, pantry) {
  if (!recipe?.ings?.length) return 0;
  return Math.round((recipe.ings.filter((i) => listHas(pantry, i.name)).length / recipe.ings.length) * 100);
}
// Recipe ingredients that are in the pantry and expire within 3 days.
export function soonUses(recipe, pantry) {
  return (recipe?.ings || [])
    .map((i) => i.name)
    .filter((n) => pantry.some((p) => !p.isLeftover && p.days != null && p.days <= 3 && sameIngredient(p.name, n)));
}

// ── diet filters ────────────────────────────────────────────────────────────
export const DIETS = [
  ["veg", "Vegetarian"],
  ["vegan", "Vegan"],
  ["gf", "Gluten-free"],
  ["noNuts", "Nut-free"],
  ["noDairy", "Dairy-free"],
];
export const SPICE = [
  ["No heat", 0],
  ["Mild", 1],
  ["Medium", 2],
  ["Any", 3],
];
export const NO_FILTERS = { veg: false, vegan: false, gf: false, noNuts: false, noDairy: false, spice: 3 };
export const filterCount = (f) => DIETS.filter(([k]) => f[k]).length + (f.spice < 3 ? 1 : 0);
export function passes(r, f) {
  const t = r?.tags;
  if (!t) return true; // not analysed yet: don't hide it
  return !((f.veg && !t.veg) || (f.vegan && !t.vegan) || (f.gf && !t.gf) || (f.noNuts && t.nuts) || (f.noDairy && t.dairy) || t.spice > f.spice);
}
export function blockReason(r, f) {
  const t = r?.tags, o = [];
  if (!t) return "";
  if (f.vegan && !t.vegan) o.push("not vegan");
  else if (f.veg && !t.veg) o.push("contains meat or fish");
  if (f.gf && !t.gf) o.push("contains gluten");
  if (f.noNuts && t.nuts) o.push("contains nuts");
  if (f.noDairy && t.dairy) o.push("contains dairy");
  if (t.spice > f.spice) o.push("too spicy");
  return o.join(", ");
}
function tagsFrom(raw) {
  if (!raw || typeof raw !== "object") return null;
  const spice = Number(raw.spiceLevel ?? raw.spice);
  return {
    veg: !!(raw.vegetarian ?? raw.veg),
    vegan: !!(raw.vegan),
    gf: !!(raw.glutenFree ?? raw.gf),
    nuts: !!(raw.containsNuts ?? raw.nuts),
    dairy: !!(raw.containsDairy ?? raw.dairy),
    spice: Number.isFinite(spice) ? Math.max(0, Math.min(3, spice)) : 1,
  };
}

// ── amounts ─────────────────────────────────────────────────────────────────
const VULGAR = { "¼": 0.25, "½": 0.5, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3 };
const FR = { 0.25: "¼", 0.5: "½", 0.75: "¾" };
function fmtNum(v) {
  const w = Math.floor(v), rem = Math.round((v - w) * 4) / 4;
  if (rem > 0 && rem < 1 && v < 10) return (w || "") + FR[rem];
  return String(Math.round(v * 10) / 10);
}
// Scale the leading quantity of a free-text amount ("1 1/2 cups", "200g", "½ tsp").
export function scaleAmount(amount, factor) {
  const s = String(amount || "").trim();
  if (!s) return "to taste";
  if (factor === 1) return s;
  // "1 1/2", "1/2", "1.5", "1½", "½"
  const m =
    s.match(/^(?:(\d+)\s+)?(\d+)\/(\d+)/) ||
    s.match(/^(\d+(?:\.\d+)?)(?:\s*([¼½¾⅓⅔]))?/) ||
    s.match(/^()([¼½¾⅓⅔])/);
  if (!m) return s;
  let v = 0;
  if (m.length === 4 && m[3] !== undefined && /\//.test(m[0])) {
    v = (m[1] ? parseFloat(m[1]) : 0) + parseFloat(m[2]) / parseFloat(m[3]);
  } else {
    if (m[1]) v += parseFloat(m[1]);
    if (m[2]) v += VULGAR[m[2]] || 0;
  }
  if (!v) return s;
  const rest = s.slice(m[0].length);
  const scaled = v * factor;
  if (/^\s*g\b/i.test(rest) && scaled >= 1000) return `${Math.round(scaled / 100) / 10} kg${rest.replace(/^\s*g/i, "")}`;
  return fmtNum(scaled) + rest;
}

export function parseTimer(text) {
  const tm = String(text || "").match(/(\d+)\s*(?:-|to)?\s*(?:\d+\s*)?(?:min|mins|minutes)\b/i);
  if (tm) return Math.min(+tm[1], 180);
  const hr = String(text || "").match(/(\d+(?:\.\d+)?)\s*(?:hour|hours|hr|hrs)\b/i);
  return hr ? Math.min(Math.round(parseFloat(hr[1]) * 60), 240) : undefined;
}

const titleCase = (n) => n.replace(/\b\w/g, (c) => c.toUpperCase());
function blocksToText(desc) {
  if (!desc) return "";
  if (typeof desc === "string") return desc;
  if (Array.isArray(desc))
    return desc.map((b) => (b.children || []).map((c) => c.text || "").join("")).join(" ").trim();
  return "";
}

export function mealIngredients(m) {
  const ings = [];
  for (let i = 1; i <= 20; i++) {
    const n = (m["strIngredient" + i] || "").trim();
    if (!n) continue;
    ings.push({ name: titleCase(n), amount: (m["strMeasure" + i] || "").trim() || "to taste" });
  }
  return ings;
}

function mealSteps(m) {
  const raw = (m.strInstructions || "").replace(/\r/g, "");
  let parts = raw
    .split(/\n+/)
    .map((x) => x.replace(/^\s*(step\s*\d+[:.)]?|\d+[.)])\s*/i, "").trim())
    .filter((x) => x.length > 14);
  if (parts.length < 2) {
    const sen = raw.split(/(?<=[.!?])\s+/).filter((x) => x.trim().length > 3);
    parts = [];
    for (let i = 0; i < sen.length; i += 2) parts.push(sen.slice(i, i + 2).join(" "));
  }
  while (parts.length > 8) {
    const merged = [];
    for (let i = 0; i < parts.length; i += 2) merged.push(parts.slice(i, i + 2).join(" "));
    parts = merged;
  }
  if (!parts.length) parts = ["Follow the recipe and enjoy."];
  return parts.map((d) => {
    const first = d.split(/[,.;:]/)[0].trim().split(/\s+/).slice(0, 5).join(" ");
    return { t: first.length > 3 ? first.charAt(0).toUpperCase() + first.slice(1) : "Keep going", d, timer: parseTimer(d) };
  });
}

// TheMealDB meal (+ optional AI insight) → unified recipe.
export function fromMealDB(m, insight) {
  const ings = mealIngredients(m);
  const steps = mealSteps(m);
  const ins = insight || null;
  const subs = {};
  (ins?.substitutions || []).forEach((s) => {
    if (s?.original && s.alternatives?.length) subs[s.original] = s.alternatives.slice(0, 3);
  });
  const nut = ins?.nutrition;
  return {
    key: "meal:" + m.idMeal,
    source: "mealdb",
    mealId: m.idMeal,
    title: m.strMeal,
    img: m.strMealThumb,
    cuisine: m.strArea && m.strArea !== "Unknown" ? m.strArea : "World",
    cat: m.strCategory || "Dish",
    desc: ins?.description || (m.strInstructions || "").split(/(?<=[.!?])\s+/)[0]?.slice(0, 170) || "",
    time: ins?.totalMinutes ? Math.round(ins.totalMinutes) : Math.max(15, Math.min(120, steps.length * 10)),
    baseServes: ins?.servings || 4,
    cal: nut?.calories != null ? Math.round(nut.calories) : null,
    nut: nut ? { protein: Math.round(nut.protein || 0), carbs: Math.round(nut.carbs || 0), fat: Math.round(nut.fat || 0) } : null,
    tags: tagsFrom(ins?.dietTags) || (m.strCategory === "Vegan" ? tagsFrom({ vegetarian: 1, vegan: 1, spiceLevel: 1 }) : null),
    subs,
    left: ins?.leftoverIdea || null,
    ings,
    steps,
    analysed: !!ins,
  };
}

// Servd recipe (Strapi row or freshly generated AI recipe) → unified recipe.
export function fromServd(r) {
  const n = r.nutrition || {};
  const num = (v) => {
    const x = parseFloat(String(v ?? "").replace(/[^\d.]/g, ""));
    return Number.isFinite(x) ? Math.round(x) : null;
  };
  const subs = {};
  (r.substitutions || r.substitution || []).forEach((s) => {
    if (s?.original && s.alternatives?.length) subs[s.original] = s.alternatives.slice(0, 3);
  });
  const time = (parseInt(r.prepTime) || 0) + (parseInt(r.cookTime) || 0);
  return {
    key: "servd:" + r.title,
    source: "servd",
    id: r.documentId || null,
    title: r.title,
    img: r.imageUrl || "",
    cuisine: titleCase(String(r.cuisine || "World").replace(/\s*-\s*/g, "-")),
    cat: titleCase(String(r.category || "Dish")),
    desc: blocksToText(r.description),
    time: time || null,
    baseServes: parseInt(r.servings) || 2,
    cal: num(n.calories),
    nut: n.protein != null ? { protein: num(n.protein) || 0, carbs: num(n.carbs) || 0, fat: num(n.fat) || 0 } : null,
    tags: tagsFrom(r.dietTags),
    subs,
    left: r.leftoverIdea || null,
    tips: r.tips || [],
    ings: (r.ingredients || []).map((i) => ({ name: i.item || i.name, amount: i.amount || "", category: i.category })),
    steps: (r.instructions || []).map((s) => ({
      t: s.title || `Step ${s.step}`,
      d: s.instruction || "",
      tip: s.tip || "",
      timer: Number(s.timerMinutes) > 0 ? Math.min(240, Math.round(Number(s.timerMinutes))) : parseTimer(s.instruction),
    })),
    analysed: true,
  };
}

// Where a recipe opens in the dashboard hero.
export function heroHref(r) {
  return r.source === "mealdb" ? `/dashboard?meal=${r.mealId}` : `/dashboard?cook=${encodeURIComponent(r.title)}`;
}
export const cookHref = (title) => `/recipe?cook=${encodeURIComponent(title)}`;

export function recipeText(r, serves, swaps = {}) {
  const f = serves / (r.baseServes || serves);
  return (
    `${r.title} — ${fmtTime(r.time)}, serves ${serves}\n\nIngredients:\n` +
    r.ings.map((i) => `• ${scaleAmount(i.amount, f)} ${swaps[i.name] || i.name}`).join("\n") +
    "\n\nMethod:\n" +
    r.steps.map((s, i) => `${i + 1}. ${s.t} — ${s.d}`).join("\n") +
    "\n\nCooked with Servd"
  );
}
