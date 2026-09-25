import { redirect } from "next/navigation";

// Old cuisine grid → the Explore tab.
export default async function CuisineRecipesPage({ params }) {
  const { cuisine } = await params;
  const name = decodeURIComponent(cuisine).replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  redirect(`/explore?area=${encodeURIComponent(name)}`);
}
