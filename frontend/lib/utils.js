import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function getStrapiUrl() {
  const url = process.env.NEXT_PUBLIC_STRAPI_URL || "https://food-backend-e25g.onrender.com";
  if (
    typeof window !== "undefined" &&
    !window.location.hostname.includes("localhost") &&
    url.includes("localhost")
  ) {
    return "https://food-backend-e25g.onrender.com";
  }
  return url.replace(/\/$/, "");
}
