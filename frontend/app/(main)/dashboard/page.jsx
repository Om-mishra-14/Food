import { getCategories, getRecipeOfTheDay } from "@/actions/mealdb.actions";
import { listMeals, lookupMeal, lookupMeals } from "@/actions/meals.actions";
import DashboardScreen from "@/components/servd/DashboardScreen";

// ?meal=<TheMealDB id> opens that dish, ?cook=<title> opens a Servd recipe,
// ?cat=<category> jumps to a category; otherwise the recipe of the day.
const dayIndex = () => Math.floor(Date.now() / 86400000);

export default async function DashboardPage({ searchParams }) {
  const sp = await searchParams;
  const [cats, rotd] = await Promise.all([
    getCategories().catch(() => ({ categories: [] })),
    sp.meal || sp.cook || sp.cat ? Promise.resolve(null) : getRecipeOfTheDay().catch(() => null),
  ]);
  const categories = (cats.categories || []).map((c) => c.strCategory);

  let heroMeal = rotd?.recipe || null;
  if (sp.meal) heroMeal = await lookupMeal(sp.meal).catch(() => null);

  const activeCat = sp.cat || heroMeal?.strCategory || null;
  let feed = [];
  if (activeCat) {
    const list = await listMeals("category", activeCat).catch(() => []);
    if (sp.cat && !heroMeal && list.length) {
      // a stable "pick of the day" within the category
      heroMeal = await lookupMeal(list[dayIndex() % list.length].id).catch(() => null);
    }
    const others = list.filter((m) => m.id !== heroMeal?.idMeal).slice(0, 6);
    feed = await lookupMeals(others.map((m) => m.id)).catch(() => []);
  }

  return (
    <DashboardScreen
      key={heroMeal?.idMeal || sp.cook || activeCat || "rotd"}
      categories={categories}
      activeCat={activeCat}
      heroMeal={heroMeal}
      cookTitle={sp.cook || null}
      cookImg={sp.img || ""}
      fromExplore={sp.from === "explore"}
      isRecipeOfDay={!sp.meal && !sp.cook && !sp.cat}
      feedMeals={feed}
    />
  );
}
