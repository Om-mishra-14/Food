// TheMealDB areas shown on the Explore tab, with their country and region.
export const AREAS = [
  ["American", "United States", "US", "Americas"],
  ["Canadian", "Canada", "CA", "Americas"],
  ["Mexican", "Mexico", "MX", "Americas"],
  ["Jamaican", "Jamaica", "JM", "Americas"],
  ["Uruguayan", "Uruguay", "UY", "Americas"],
  ["British", "United Kingdom", "GB", "Europe"],
  ["Irish", "Ireland", "IE", "Europe"],
  ["French", "France", "FR", "Europe"],
  ["Italian", "Italy", "IT", "Europe"],
  ["Spanish", "Spain", "ES", "Europe"],
  ["Portuguese", "Portugal", "PT", "Europe"],
  ["Greek", "Greece", "GR", "Europe"],
  ["Dutch", "Netherlands", "NL", "Europe"],
  ["Polish", "Poland", "PL", "Europe"],
  ["Croatian", "Croatia", "HR", "Europe"],
  ["Russian", "Russia", "RU", "Europe"],
  ["Ukrainian", "Ukraine", "UA", "Europe"],
  ["Indian", "India", "IN", "Asia"],
  ["Chinese", "China", "CN", "Asia"],
  ["Japanese", "Japan", "JP", "Asia"],
  ["Thai", "Thailand", "TH", "Asia"],
  ["Vietnamese", "Vietnam", "VN", "Asia"],
  ["Malaysian", "Malaysia", "MY", "Asia"],
  ["Filipino", "Philippines", "PH", "Asia"],
  ["Turkish", "Turkey", "TR", "Middle East & Africa"],
  ["Egyptian", "Egypt", "EG", "Middle East & Africa"],
  ["Moroccan", "Morocco", "MA", "Middle East & Africa"],
  ["Tunisian", "Tunisia", "TN", "Middle East & Africa"],
  ["Kenyan", "Kenya", "KE", "Middle East & Africa"],
].map(([a, c, code, region]) => ({ a, c, code, region }));

export const REGIONS = ["All", "Europe", "Asia", "Americas", "Middle East & Africa"];
export const DASH_CUISINES = ["Italian", "Indian", "Mexican", "Japanese", "Thai", "French", "Chinese", "Greek", "British", "Moroccan"];
export const findArea = (name) =>
  AREAS.find((x) => x.a.toLowerCase() === String(name || "").toLowerCase().replace(/-/g, " "));
