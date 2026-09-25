import ExploreScreen from "@/components/servd/ExploreScreen";
import { findArea } from "@/lib/servd/areas";

export default async function ExplorePage({ searchParams }) {
  const sp = await searchParams;
  const area = findArea(sp.area)?.a || "Italian";
  return <ExploreScreen initialArea={area} />;
}
