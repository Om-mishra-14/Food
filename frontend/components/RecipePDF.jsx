import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { fmtTime, scaleAmount } from "@/lib/servd/recipe";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica", color: "#121212" },
  brand: { color: "#E11D24", fontSize: 18, fontWeight: "bold", marginBottom: 14 },
  photo: { width: "100%", height: 220, objectFit: "cover", borderRadius: 14, marginBottom: 16 },
  title: { fontSize: 24, marginBottom: 6, fontWeight: "bold" },
  meta: { color: "#6A6A72", marginBottom: 10 },
  text: { marginBottom: 4, lineHeight: 1.5 },
  heading: { fontSize: 12, marginTop: 16, marginBottom: 8, fontWeight: "bold", color: "#E11D24", letterSpacing: 1.2 },
});

// recipe: unified Servd recipe shape (lib/servd/recipe.js)
export function RecipePDF({ recipe, serves, swaps = {} }) {
  const f = serves / (recipe.baseServes || serves);
  const meta = [fmtTime(recipe.time), `${serves} servings`, recipe.cal != null ? `${recipe.cal} kcal` : null].filter(Boolean).join(" · ");
  return (
    <Document title={recipe.title}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>SERVD</Text>
        {/* react-pdf Image has no alt attribute */}
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        {/^https?:/.test(recipe.img || "") && <Image src={recipe.img} style={styles.photo} />}
        <Text style={styles.title}>{recipe.title}</Text>
        <Text style={styles.meta}>{meta}</Text>
        {recipe.desc ? <Text style={styles.text}>{recipe.desc}</Text> : null}

        <Text style={styles.heading}>INGREDIENTS</Text>
        {recipe.ings.map((ing, i) => (
          <Text key={i} style={styles.text}>
            • {scaleAmount(ing.amount, f)} {swaps[ing.name] || ing.name}
          </Text>
        ))}

        <Text style={styles.heading}>METHOD</Text>
        {recipe.steps.map((s, i) => (
          <View key={i} style={{ marginBottom: 8 }}>
            <Text style={{ fontWeight: "bold" }}>{i + 1}. {s.t}</Text>
            <Text style={styles.text}>{s.d}</Text>
          </View>
        ))}

        {recipe.tips?.length > 0 && (
          <>
            <Text style={styles.heading}>CHEF&apos;S TIPS</Text>
            {recipe.tips.map((tip, i) => (
              <Text key={i} style={styles.text}>• {tip}</Text>
            ))}
          </>
        )}
      </Page>
    </Document>
  );
}
