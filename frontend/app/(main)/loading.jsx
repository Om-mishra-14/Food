// Shown instantly while a screen's server data loads.
export default function Loading() {
  return (
    <div data-screen="1" aria-busy="true" style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      <div className="sv-skel" style={{ height: 44, width: "min(420px, 80%)", borderRadius: 14 }} />
      <div className="sv-skel" style={{ height: 18, width: "min(520px, 90%)", borderRadius: 10 }} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 44, alignItems: "center" }}>
        <div className="sv-skel" style={{ flex: "0 1 360px", minWidth: "min(240px, 100%)", aspectRatio: 1, borderRadius: "50%" }} />
        <div style={{ flex: "1 1 320px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="sv-skel" style={{ height: 48, borderRadius: 14 }} />
          <div className="sv-skel" style={{ height: 18, borderRadius: 10, width: "80%" }} />
          <div className="sv-skel" style={{ height: 18, borderRadius: 10, width: "60%" }} />
          <div className="sv-skel" style={{ height: 60, borderRadius: 999, width: "70%", marginTop: 12 }} />
        </div>
      </div>
    </div>
  );
}
