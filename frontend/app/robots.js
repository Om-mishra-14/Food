import { SITE_URL } from "@/lib/site";

// Served at /robots.txt. Signed-in app pages are private, so keep crawlers on the public pages.
export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard", "/pantry", "/recipe", "/recipes", "/explore", "/planner"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
