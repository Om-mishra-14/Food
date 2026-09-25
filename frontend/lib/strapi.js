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
