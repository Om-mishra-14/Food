"use server";
import { checkUser } from "@/lib/checkUser";
import { strapi, ownedDoc, askJson, addDays } from "@/lib/strapi";

const toItem = (d) => ({
  id: d.documentId,
  name: d.name,
  quantity: d.quantity || "",
  expiresAt: d.expiresAt || null,
  isLeftover: !!d.isLeftover,
  leftoverIdea: d.leftoverIdea || "",
  imageUrl: d.imageUrl || "",
  createdAt: d.createdAt,
});

async function requireUser() {
  const user = await checkUser();
  if (!user) throw new Error("User not authenticated");
  return user;
}

// Ask the model how many days each ingredient keeps in a home kitchen.
async function estimateShelfLife(names) {
  if (!names.length) return {};
  try {
    const out = await askJson(
      "gpt-4.1-nano",
      `For each food ingredient below, estimate how many days it stays good in a typical home kitchen once bought (fridge for perishables, cupboard for dry goods). Return ONLY a JSON object mapping the exact ingredient name to a whole number of days (1-365), no markdown.\n\nIngredients:\n${names.map((n) => `- ${n}`).join("\n")}`
    );
    return out && typeof out === "object" ? out : {};
  } catch (e) {
    console.error("Shelf-life estimate failed:", e);
    return {};
  }
}

async function createItems(user, items) {
  const created = [];
  for (const it of items) {
    const data = await strapi("pantry-items", {
      method: "POST",
      body: {
        data: {
          name: it.name.trim(),
          quantity: (it.quantity || "").trim(),
          imageUrl: it.imageUrl || "",
          expiresAt: it.expiresAt || null,
          isLeftover: !!it.isLeftover,
          leftoverIdea: it.leftoverIdea || null,
          owner: user.id,
        },
      },
    });
    created.push(toItem(data.data));
  }
  return created;
}

export async function scanPantryImage(formData) {
  const user = await requireUser();
  const isPro = user.subscriptionTier === "pro";
  const imagefile = formData.get("image");
  if (!imagefile || typeof imagefile.arrayBuffer !== "function") {
    throw new Error("No image provided");
  }

  const bytes = await imagefile.arrayBuffer();
  const base64Image = Buffer.from(bytes).toString("base64");
  const mime = imagefile.type || "image/jpeg";

  const prompt = `
You are a professional chef and ingredient recognition expert. Analyze this image of a pantry/fridge and identify all visible food ingredients.

Return ONLY a valid JSON array with this exact structure (no markdown, no explanations):
[
  {
    "name": "ingredient name",
    "quantity": "estimated quantity with unit",
    "confidence": 0.95,
    "shelfLifeDays": 5,
    "x": 42,
    "y": 30
  }
]

Rules:
- Only identify food ingredients (not containers, utensils, or packaging)
- Be specific (e.g., "Cheddar Cheese" not just "Cheese")
- Estimate realistic quantities (e.g., "3 eggs", "1 cup milk", "2 tomatoes")
- Confidence should be 0.7-1.0 (omit items below 0.7)
- shelfLifeDays: how many more days it will stay good at home, as a whole number
- x and y: where the ingredient appears in the photo, as a percentage (0-100) from the left and from the top
- Maximum 20 items
- Common pantry staples are acceptable (salt, pepper, oil)
`;

  let ingredients;
  try {
    ingredients = await askJson("gpt-4.1-nano", [
      {
        role: "user",
        content: [
          { type: "input_text", text: prompt },
          { type: "input_image", image_url: `data:${mime};base64,${base64Image}` },
        ],
      },
    ]);
  } catch (error) {
    console.error("Failed to scan pantry image:", error);
    throw new Error("Failed to read ingredients from that photo. Please try again");
  }

  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    throw new Error("No ingredients detected in the image. Please try a cleaner photo.");
  }

  const num = (v) => (v === null || v === undefined || v === "" ? NaN : Number(v));
  return {
    success: true,
    ingredients: ingredients
      .slice(0, 20)
      .map((i) => ({
        name: String(i.name || "").trim(),
        quantity: String(i.quantity || "").trim(),
        confidence: Math.round(Math.min(1, Math.max(0, Number(i.confidence) || 0.8)) * 100),
        shelfLifeDays: Number(i.shelfLifeDays) || null,
        x: Number.isFinite(num(i.x)) ? Math.min(80, Math.max(2, num(i.x))) : null,
        y: Number.isFinite(num(i.y)) ? Math.min(88, Math.max(4, num(i.y))) : null,
      }))
      .filter((i) => i.name),
    scansLimit: isPro ? "Unlimited" : 10,
  };
}

// items: [{ name, quantity, shelfLifeDays? }]
export async function addPantryItems(items) {
  const user = await requireUser();
  const list = (items || []).filter((i) => i?.name?.trim());
  if (!list.length) throw new Error("No ingredients to save");
  const unknown = list.filter((i) => !i.shelfLifeDays).map((i) => i.name);
  const est = await estimateShelfLife(unknown);
  const created = await createItems(
    user,
    list.map((i) => ({
      ...i,
      expiresAt: addDays(Number(i.shelfLifeDays) || Number(est[i.name]) || 7),
    }))
  );
  return { success: true, items: created };
}

export async function saveLeftover({ title, portions, imageUrl, idea }) {
  const user = await requireUser();
  const name = `Leftover ${String(title || "dish").split(" ").slice(-1)[0]}`;
  const [item] = await createItems(user, [
    {
      name,
      quantity: `${portions} ${portions === 1 ? "portion" : "portions"}`,
      imageUrl: imageUrl || "",
      expiresAt: addDays(2),
      isLeftover: true,
      leftoverIdea: idea || "Box it up for tomorrow's lunch — most dishes reheat well.",
    },
  ]);
  return { success: true, item };
}

export async function getPantryItems() {
  const user = await requireUser();
  const data = await strapi(
    `pantry-items?filters[owner][id][$eq]=${user.id}&sort=createdAt:desc&pagination[pageSize]=200`
  );
  return {
    success: true,
    items: (data.data || []).map(toItem),
    scansLimit: user.subscriptionTier === "pro" ? "unlimited" : 10,
  };
}

// Give items saved before expiry tracking existed an estimated use-by date.
export async function fillMissingExpiry() {
  const user = await requireUser();
  const data = await strapi(
    `pantry-items?filters[owner][id][$eq]=${user.id}&filters[expiresAt][$null]=true&pagination[pageSize]=100`
  );
  const rows = data.data || [];
  if (!rows.length) return { success: true, items: [] };
  const est = await estimateShelfLife(rows.map((r) => r.name));
  const updated = [];
  for (const r of rows) {
    const days = Number(est[r.name]) || 7;
    const base = r.createdAt ? new Date(r.createdAt) : new Date();
    const res = await strapi(`pantry-items/${r.documentId}`, {
      method: "PUT",
      body: { data: { expiresAt: addDays(days, base) } },
    });
    updated.push(toItem(res.data));
  }
  return { success: true, items: updated };
}

export async function deletePantryItem(itemId) {
  const user = await requireUser();
  const doc = await ownedDoc("pantry-items", itemId, user.id);
  if (!doc) throw new Error("Item not found");
  await strapi(`pantry-items/${itemId}`, { method: "DELETE" });
  return { success: true };
}

export async function updatePantryItem(itemId, { name, quantity }) {
  const user = await requireUser();
  const doc = await ownedDoc("pantry-items", itemId, user.id);
  if (!doc) throw new Error("Item not found");
  const res = await strapi(`pantry-items/${itemId}`, {
    method: "PUT",
    body: { data: { name, quantity } },
  });
  return { success: true, item: toItem(res.data) };
}
