"use server";
// TheMealDB lookups plus AI "insights" that fill the gaps the library leaves:
// nutrition, diet tags, time, substitutions and a leftover idea. Insights are
// cached in Strapi so each meal is analysed once for everyone.
import { unstable_cache } from "next/cache";
import { checkUser } from "@/lib/checkUser";
import { strapi, askJson, findDishPhoto } from "@/lib/strapi";
import { MEALDB_API, mealIngredients } from "@/lib/servd/recipe";

// TheMealDB is a free API that sometimes times out or answers with an HTML
// error page; retry a couple of times before giving up.
async function mealdb(path, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(`${MEALDB_API}/${path}`, {
        next: { revalidate: 86400 },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`TheMealDB ${res.status}`);
      const data = await res.json();
      return Array.isArray(data.meals) ? data.meals : [];
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  console.error(`TheMealDB ${path} failed:`, lastErr);
  throw new Error("Couldn't reach the recipe library");
}

export async function lookupMeal(id) {
  return (await mealdb(`lookup.php?i=${encodeURIComponent(id)}`))[0] || null;
}

export async function lookupMeals(ids) {
  const meals = await Promise.all((ids || []).slice(0, 12).map((id) => lookupMeal(id).catch(() => null)));
  return meals.filter(Boolean);
}

export async function listMeals(kind, value) {
  const q = kind === "area" ? "a" : "c";
  const meals = await mealdb(`filter.php?${q}=${encodeURIComponent(value)}`);
  return meals.map((m) => ({ id: m.idMeal, title: m.strMeal, img: m.strMealThumb, source: "mealdb" }));
}

async function unsplashImage(query) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return "";
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=squarish`,
      { headers: { Authorization: `Client-ID ${key}` }, next: { revalidate: 604800 } }
    );
    if (!res.ok) return "";
    const data = await res.json();
    return data.results?.[0]?.urls?.small || "";
  } catch {
    return "";
  }
}

// Signature dishes suggested by AI for a cuisine, cached for a week.
const aiCuisineDishes = unstable_cache(
  async (area) => {
    const list = await askJson(
      "gpt-4.1-mini",
      `List 24 authentic, popular ${area} dishes that people commonly cook at home, covering mains, breads/rice, snacks and desserts. Use the name the dish is best known by (e.g. "Butter Chicken", "Chole Bhature", "Masala Dosa"). Return ONLY a JSON array of strings, no markdown.`
    );
    const titles = (Array.isArray(list) ? list : []).map((t) => String(t).trim()).filter(Boolean).slice(0, 24);
    const imgs = await Promise.all(titles.map(async (t) => (await unsplashImage(`${t} ${area} food`)) || (await findDishPhoto(t))));
    return titles.map((title, i) => ({ id: "ai:" + title, title, img: imgs[i], source: "ai" }));
  },
  ["ai-cuisine-dishes-v2"],
  { revalidate: 604800 }
);

// Dishes for the Explore tab: TheMealDB first, topped up with AI suggestions
// when the library has only a handful (e.g. Indian) or can't be reached.
export async function getCuisineDishes(area) {
  const user = await checkUser();
  let library = [], libraryError = null;
  try {
    library = await listMeals("area", area);
  } catch (e) {
    libraryError = e;
  }
  if (library.length >= 24 || !user) {
    if (libraryError) throw libraryError;
    return library;
  }
  let extra = [];
  try {
    extra = await aiCuisineDishes(area);
  } catch (e) {
    console.error("AI cuisine dishes failed:", e);
    if (libraryError) throw libraryError;
  }
  const seen = new Set(library.map((m) => m.title.toLowerCase()));
  return [...library, ...extra.filter((m) => !seen.has(m.title.toLowerCase()))];
}

const INSIGHT_SHAPE = `{
  "mealId": "the id given",
  "description": "one appetising sentence about the dish (max 170 chars)",
  "totalMinutes": 45,
  "servings": 4,
  "nutrition": { "calories": 520, "protein": 30, "carbs": 45, "fat": 22 },
  "dietTags": { "vegetarian": false, "vegan": false, "glutenFree": false, "containsNuts": false, "containsDairy": true, "spiceLevel": 1 },
  "substitutions": [ { "original": "exact ingredient name from the list", "alternatives": ["substitute 1", "substitute 2"] } ],
  "leftoverIdea": "one sentence on how to use up leftovers tomorrow"
}`;

// meals: raw TheMealDB meal objects. Returns { [mealId]: insight }.
export async function getMealInsights(meals) {
  const user = await checkUser();
  if (!user) throw new Error("User not authenticated");
  const list = (meals || []).filter((m) => m?.idMeal).slice(0, 10);
  if (!list.length) return {};

  const out = {};
  const idFilter = list.map((m, i) => `filters[mealId][$in][${i}]=${m.idMeal}`).join("&");
  try {
    const cached = await strapi(`meal-insights?${idFilter}&pagination[pageSize]=20`);
    (cached.data || []).forEach((row) => (out[row.mealId] = row.data));
  } catch (e) {
    console.error("Reading cached insights failed:", e);
  }

  const missing = list.filter((m) => !out[m.idMeal]);
  if (!missing.length) return out;

  const described = missing
    .map(
      (m) =>
        `- id ${m.idMeal}: ${m.strMeal} (${m.strArea}, ${m.strCategory}). Ingredients: ` +
        mealIngredients(m).map((i) => `${i.amount} ${i.name}`).join(", ")
    )
    .join("\n");

  let fresh = [];
  try {
    fresh = await askJson(
      "gpt-4.1-mini",
      `You are a nutritionist and chef. For each dish below, estimate per-serving nutrition and cooking facts.\n\n${described}\n\nReturn ONLY a JSON array with one object per dish, shaped exactly like:\n${INSIGHT_SHAPE}\n\nRules: spiceLevel is 0 (no heat) to 3 (hot). Give substitutions for 2-4 ingredients a home cook is likely to be missing. Use whole numbers.`
    );
  } catch (e) {
    console.error("Meal insight generation failed:", e);
    return out;
  }

  for (const ins of Array.isArray(fresh) ? fresh : []) {
    const id = String(ins?.mealId || "");
    if (!missing.some((m) => m.idMeal === id)) continue;
    out[id] = ins;
    strapi("meal-insights", { method: "POST", body: { data: { mealId: id, data: ins } } }).catch((e) =>
      console.error("Caching insight failed:", e)
    );
  }
  return out;
}
