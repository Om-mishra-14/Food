import { redirect } from "next/navigation";

// Old category grid → the dashboard's category pills.
export default async function CategoryRecipesPage({ params }) {
  const { category } = await params;
  const name = decodeURIComponent(category).replace(/\b\w/g, (c) => c.toUpperCase());
  redirect(`/dashboard?cat=${encodeURIComponent(name)}`);
}
