// Server-only helpers for talking to the Strapi backend with the API token.
import OpenAI from "openai";

export const STRAPI_URL =
  process.env.NEXT_PUBLIC_STRAPI_URL || "https://food-backend-e25g.onrender.com";
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

export async function strapi(path, { method = "GET", body } = {}) {
  const res = await fetch(`${STRAPI_URL}/api/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`Strapi ${method} ${path} failed:`, res.status, text);
    throw new Error(`Request to the Servd backend failed (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// Fetch a document only if it belongs to the given user; returns null otherwise.
export async function ownedDoc(collection, documentId, userId, ownerField = "owner") {
  const data = await strapi(
    `${collection}?filters[documentId][$eq]=${encodeURIComponent(documentId)}` +
      `&filters[${ownerField}][id][$eq]=${userId}`
  );
  return data?.data?.[0] || null;
}

let _openai = null;
export function openai() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

// Ask the model for JSON and parse it, tolerating ```json fences.
export async function askJson(model, input) {
  const response = await openai().responses.create({ model, input });
  const text = response.output_text || "";
  const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(clean);
}

export function addDays(days, from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + Math.max(0, Math.round(days)));
  return d.toISOString().slice(0, 10);
}

// A photo for a dish name: Unsplash when a key is set, otherwise the closest
// TheMealDB dish. Returns "" when nothing is found.
export async function findDishPhoto(title) {
  const q = String(title || "").trim();
  if (!q) return "";
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (key) {
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q + " food")}&per_page=1&orientation=squarish`,
        { headers: { Authorization: `Client-ID ${key}` }, next: { revalidate: 604800 } }
      );
      if (res.ok) {
        const url = (await res.json()).results?.[0]?.urls?.regular;
        if (url) return url;
      }
    } catch {}
  }
  const words = q.split(/\s+/);
  const tries = [q, words.slice(-2).join(" "), words[words.length - 1]].filter((x, i, a) => x && a.indexOf(x) === i);
  for (const t of tries) {
    try {
      const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(t)}`, {
        next: { revalidate: 604800 },
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) continue;
      const meals = (await res.json()).meals;
      if (Array.isArray(meals) && meals[0]?.strMealThumb) return meals[0].strMealThumb;
    } catch {}
  }
  return "";
}
