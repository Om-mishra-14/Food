import { redirect } from "next/navigation";

// "What can I cook?" now lives at the bottom of My Pantry.
export default function PantryRecipesPage() {
  redirect("/pantry#cook-with");
}
