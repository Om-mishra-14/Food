import { SITE_URL } from "@/lib/site";

// Served at /sitemap.xml. Only pages a visitor can open without signing in.
export default function sitemap() {
  const lastModified = new Date();
  return [
    { url: SITE_URL, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/sign-up`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/sign-in`, lastModified, changeFrequency: "monthly", priority: 0.3 },
  ];
}
