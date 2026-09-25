"use server";
// Shopping list, weekly meal planner and diet preferences, plus one call that
// loads everything the app shell needs for a signed-in user.
import { checkUser, forgetCachedUser } from "@/lib/checkUser";
import { strapi, ownedDoc, askJson } from "@/lib/strapi";
import { getPantryItems } from "./pantry.actions";

async function requireUser() {
  const user = await checkUser();
  if (!user) throw new Error("User not authenticated");
  return user;
}

const toShop = (d) => ({
  id: d.documentId,
  name: d.name,
  quantity: d.quantity || "",
  forRecipe: d.forRecipe || "",
  done: !!d.done,
});
const toPlan = (d) => ({
  id: d.documentId,
  slot: d.slot,
  key: d.recipeKey,
  title: d.title,
  img: d.imageUrl || "",
  ings: Array.isArray(d.ingredients) ? d.ingredients : [],
});

export async function getKitchenState() {
  const user = await checkUser();
  if (!user) return { signedIn: false };
  const [pantry, shop, plan, saved] = await Promise.all([
    getPantryItems().catch(() => ({ items: [] })),
    strapi(`shopping-items?filters[owner][id][$eq]=${user.id}&sort=createdAt:desc&pagination[pageSize]=200`).catch(() => ({ data: [] })),
    strapi(`meal-plan-entries?filters[owner][id][$eq]=${user.id}&pagination[pageSize]=50`).catch(() => ({ data: [] })),
    strapi(`saved-recipes?filters[user][id][$eq]=${user.id}&populate[recipe][fields][0]=title&pagination[pageSize]=200`).catch(() => ({ data: [] })),
  ]);
  return {
    signedIn: true,
    isPro: user.subscriptionTier === "pro",
    pantry: pantry.items || [],
    shop: (shop.data || []).map(toShop),
    plan: (plan.data || []).map(toPlan),
    savedTitles: (saved.data || []).map((s) => s.recipe?.title).filter(Boolean),
    preferences: user.preferences || {},
  };
}

// After a Pro upgrade: drop the cached user so the new tier is read from Strapi.
export async function refreshAccount() {
  const user = await checkUser();
  if (user) forgetCachedUser(user.clerkid);
  return getKitchenState();
}

// ── shopping list ───────────────────────────────────────────────────────────
// items: [{ name, quantity, forRecipe }]
export async function addShoppingItems(items) {
  const user = await requireUser();
  const created = [];
  for (const it of items || []) {
    if (!it?.name?.trim()) continue;
    const res = await strapi("shopping-items", {
      method: "POST",
      body: {
        data: {
          name: it.name.trim(),
          quantity: it.quantity || "",
          forRecipe: it.forRecipe || "",
          done: false,
          owner: user.id,
        },
      },
    });
    created.push(toShop(res.data));
  }
  return { success: true, items: created };
}

export async function setShoppingItemDone(id, done) {
  const user = await requireUser();
  if (!(await ownedDoc("shopping-items", id, user.id))) throw new Error("Item not found");
  const res = await strapi(`shopping-items/${id}`, { method: "PUT", body: { data: { done: !!done } } });
  return { success: true, item: toShop(res.data) };
}

export async function removeShoppingItem(id) {
  const user = await requireUser();
  if (!(await ownedDoc("shopping-items", id, user.id))) throw new Error("Item not found");
  await strapi(`shopping-items/${id}`, { method: "DELETE" });
  return { success: true };
}

// ── weekly planner ──────────────────────────────────────────────────────────
// recipe: { key, title, img, ings: [{ name, amount }] }
export async function setPlanSlot(slot, recipe) {
  const user = await requireUser();
  if (!/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)-(Lunch|Dinner)$/.test(slot)) throw new Error("Invalid slot");
  const existing = await strapi(
    `meal-plan-entries?filters[owner][id][$eq]=${user.id}&filters[slot][$eq]=${slot}`
  );
  for (const e of existing.data || []) await strapi(`meal-plan-entries/${e.documentId}`, { method: "DELETE" });
  const res = await strapi("meal-plan-entries", {
    method: "POST",
    body: {
      data: {
        slot,
        recipeKey: recipe.key,
        title: recipe.title,
        imageUrl: recipe.img || "",
        ingredients: (recipe.ings || []).map((i) => ({ name: i.name, amount: i.amount || "" })),
        owner: user.id,
      },
    },
  });
  return { success: true, entry: toPlan(res.data) };
}

export async function clearPlanSlot(slot) {
  const user = await requireUser();
  const existing = await strapi(
    `meal-plan-entries?filters[owner][id][$eq]=${user.id}&filters[slot][$eq]=${encodeURIComponent(slot)}`
  );
  for (const e of existing.data || []) await strapi(`meal-plan-entries/${e.documentId}`, { method: "DELETE" });
  return { success: true };
}

export async function clearPlan() {
  const user = await requireUser();
  const existing = await strapi(`meal-plan-entries?filters[owner][id][$eq]=${user.id}&pagination[pageSize]=50`);
  for (const e of existing.data || []) await strapi(`meal-plan-entries/${e.documentId}`, { method: "DELETE" });
  return { success: true };
}

// ── preferences ─────────────────────────────────────────────────────────────
export async function saveDietPreferences(filters) {
  const user = await requireUser();
  const clean = {
    veg: !!filters.veg,
    vegan: !!filters.vegan,
    gf: !!filters.gf,
    noNuts: !!filters.noNuts,
    noDairy: !!filters.noDairy,
    spice: [0, 1, 2, 3].includes(filters.spice) ? filters.spice : 3,
  };
  await strapi(`users/${user.id}`, {
    method: "PUT",
    body: { preferences: { ...(user.preferences || {}), diet: clean } },
  });
  forgetCachedUser(user.clerkid);
  return { success: true };
}

// ── substitutions for a recipe that has none yet ────────────────────────────
export async function suggestSubstitutions(title, ingredients) {
  await requireUser();
  try {
    const out = await askJson(
      "gpt-4.1-nano",
      `Recipe: ${title}\nIngredients: ${ingredients.join(", ")}\n\nFor up to 5 of these ingredients that a home cook is most likely to be missing, suggest 2 practical substitutes each. Return ONLY JSON: [{"original":"exact ingredient name","alternatives":["a","b"]}]`
    );
    return { success: true, substitutions: Array.isArray(out) ? out : [] };
  } catch {
    return { success: true, substitutions: [] };
  }
}
