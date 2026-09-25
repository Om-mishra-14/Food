"use server";
// TheMealDB lookups plus AI "insights" that fill the gaps the library leaves:
// nutrition, diet tags, time, substitutions and a leftover idea. Insights are
// cached in Strapi so each meal is analysed once for everyone.
import { checkUser } from "@/lib/checkUser";
import { strapi, askJson } from "@/lib/strapi";
import { MEALDB_API, mealIngredients } from "@/lib/servd/recipe";

export async function lookupMeal(id) {
  const res = await fetch(`${MEALDB_API}/lookup.php?i=${encodeURIComponent(id)}`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error("Couldn't reach the recipe library");
  const data = await res.json();
  return data.meals?.[0] || null;
}

export async function lookupMeals(ids) {
  const meals = await Promise.all((ids || []).slice(0, 12).map((id) => lookupMeal(id).catch(() => null)));
  return meals.filter(Boolean);
}

export async function listMeals(kind, value) {
  const q = kind === "area" ? "a" : "c";
  const res = await fetch(`${MEALDB_API}/filter.php?${q}=${encodeURIComponent(value)}`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error("Couldn't reach the recipe library");
  const data = await res.json();
  return (data.meals || []).map((m) => ({ id: m.idMeal, title: m.strMeal, img: m.strMealThumb }));
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
