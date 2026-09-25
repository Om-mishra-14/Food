import { Document, Page, Text, View, Image, Link, StyleSheet } from "@react-pdf/renderer";
import { fmtTime, scaleAmount } from "@/lib/servd/recipe";

const RED = "#E11D24";
const styles = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 56, paddingHorizontal: 44, fontSize: 11, fontFamily: "Helvetica", color: "#121212", lineHeight: 1.45 },
  brand: { color: RED, fontSize: 16, fontFamily: "Helvetica-Bold", letterSpacing: 1, marginBottom: 14 },
  photo: { width: "100%", height: 210, objectFit: "cover", borderRadius: 14, marginBottom: 16 },
  title: { fontSize: 26, fontFamily: "Helvetica-Bold", marginBottom: 6, lineHeight: 1.15 },
  desc: { fontSize: 11.5, color: "#3A3A40", marginBottom: 10 },
  metaRow: { flexDirection: "row", gap: 8, marginBottom: 6 },
  metaPill: { backgroundColor: "#EDEDF0", borderRadius: 10, paddingVertical: 3, paddingHorizontal: 9, fontSize: 10, color: "#3A3A40" },
  heading: { fontSize: 11, marginTop: 18, marginBottom: 8, fontFamily: "Helvetica-Bold", color: RED, letterSpacing: 1.4 },
  ingRow: { flexDirection: "row", paddingVertical: 4, borderBottomWidth: 0.6, borderBottomColor: "#E1E1E6", borderBottomStyle: "dashed" },
  ingAmt: { width: 110, paddingLeft: 12, color: RED, fontFamily: "Helvetica-Bold" },
  ingName: { flex: 1 },
  step: { flexDirection: "row", marginBottom: 10 },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#121212", color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 11, textAlign: "center", paddingTop: 7, marginRight: 12 },
  stepBody: { flex: 1 },
  stepTitle: { fontFamily: "Helvetica-Bold", fontSize: 12, marginBottom: 2 },
  tip: { marginTop: 4, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: RED, color: "#3A3A40", fontSize: 10.5 },
  bullet: { flexDirection: "row", marginBottom: 4 },
  bulletDot: { width: 16, paddingLeft: 4, color: RED },
  footer: { position: "absolute", left: 44, right: 44, bottom: 24, flexDirection: "row", justifyContent: "space-between", fontSize: 9, color: "#9A9AA2" },
});

// recipe: unified Servd recipe shape (lib/servd/recipe.js)
export function RecipePDF({ recipe, serves, swaps = {}, link = "" }) {
  const f = serves / (recipe.baseServes || serves);
  const meta = [fmtTime(recipe.time), `Serves ${serves}`, recipe.cal != null ? `${recipe.cal} kcal / serving` : null, `${recipe.steps.length} steps`].filter(Boolean);
  return (
    <Document title={recipe.title} author="Servd">
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>SERVD</Text>
        {/* react-pdf Image has no alt attribute */}
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        {/^https?:/.test(recipe.img || "") && <Image src={recipe.img} style={styles.photo} />}
        <Text style={styles.title}>{recipe.title}</Text>
        {recipe.desc ? <Text style={styles.desc}>{recipe.desc}</Text> : null}
        <View style={styles.metaRow}>
          {meta.map((m) => <Text key={m} style={styles.metaPill}>{m}</Text>)}
        </View>

        <Text style={styles.heading}>INGREDIENTS</Text>
        {recipe.ings.map((ing, i) => (
          <View key={i} style={styles.ingRow} wrap={false}>
            <Text style={styles.ingAmt}>{scaleAmount(ing.amount, f)}</Text>
            <Text style={styles.ingName}>{swaps[ing.name] ? `${swaps[ing.name]} (instead of ${ing.name})` : ing.name}</Text>
          </View>
        ))}

        <Text style={styles.heading}>METHOD</Text>
        {recipe.steps.map((s, i) => (
          <View key={i} style={styles.step} wrap={false}>
            <Text style={styles.stepNum}>{i + 1}</Text>
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>{s.t}</Text>
              <Text>{s.d}</Text>
              {s.tip ? <Text style={styles.tip}>Tip: {s.tip}</Text> : null}
            </View>
          </View>
        ))}

        {recipe.tips?.length > 0 && (
          <>
            <Text style={styles.heading}>CHEF&apos;S TIPS</Text>
            {recipe.tips.map((tip, i) => (
              <View key={i} style={styles.bullet} wrap={false}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={{ flex: 1 }}>{tip}</Text>
              </View>
            ))}
          </>
        )}

        <View style={styles.footer} fixed>
          <Text>Cooked with SERVD</Text>
          {link ? (
            <Link src={link} style={{ color: "#9A9AA2" }}>Open this recipe in Servd</Link>
          ) : (
            <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
          )}
        </View>
      </Page>
    </Document>
  );
}
