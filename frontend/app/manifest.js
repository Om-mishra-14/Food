// Web app manifest: lets people install Servd on their phone's home screen.
export default function manifest() {
  return {
    id: "/",
    name: "Servd — AI Cooking Assistant",
    short_name: "Servd",
    description: "Snap your fridge, find what to cook, and cook it step by step.",
    start_url: "/dashboard?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#1E1D1F",
    theme_color: "#1E1D1F",
    categories: ["food", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Scan my pantry", short_name: "Scan", url: "/pantry", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "What should I cook?", short_name: "Cook", url: "/recipe", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Explore cuisines", short_name: "Explore", url: "/explore", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
