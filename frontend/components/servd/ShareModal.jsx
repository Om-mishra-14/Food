"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Img } from "./Plate";
import { IconX } from "./icons";
import { fmtTime, recipeText } from "@/lib/servd/recipe";
import { anim } from "@/lib/servd/motion";

export default function ShareModal({ recipe: r, serves, swaps, onClose }) {
  const [copied, setCopied] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const back = useRef(null), modal = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    anim(back.current, [{ opacity: 0 }, { opacity: 1 }], { duration: 350 });
    anim(modal.current, [{ opacity: 0, transform: "translateY(40px) scale(.94)" }, { opacity: 1, transform: "none" }], { duration: 600 });
    const onKey = (e) => e.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const text = recipeText(r, serves, swaps);
  const copy = () => {
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
      .catch(() => {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch {}
        ta.remove();
      })
      .then(() => setCopied(true));
  };
  const downloadPdf = async () => {
    setPdfBusy(true);
    try {
      const [{ pdf }, { RecipePDF }] = await Promise.all([import("@react-pdf/renderer"), import("@/components/RecipePDF")]);
      const blob = await pdf(<RecipePDF recipe={r} serves={serves} swaps={swaps} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${r.title.replace(/\s+/g, "-").toLowerCase()}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't build the PDF. Please try again.");
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div ref={back} onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(18,18,18,.55)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", padding: 20, boxSizing: "border-box" }}>
      <div ref={modal} role="dialog" aria-modal="true" aria-label="Share recipe" onClick={(e) => e.stopPropagation()} style={{ width: "min(460px, 100%)", background: "#F7F7F8", borderRadius: 30, padding: 22, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 50px 100px -30px rgba(0,0,0,.6)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.02em" }}>Share recipe</div>
          <button onClick={onClose} title="Close" className="sv-circle-btn" style={{ width: 38, height: 38, color: "#121212" }}><IconX size={13} /></button>
        </div>
        <div style={{ background: "#fff", borderRadius: 24, overflow: "hidden", boxShadow: "0 20px 40px -24px rgba(0,0,0,.35)" }}>
          <div style={{ height: 200, background: "#E8D6C3" }}><Img src={r.img} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /></div>
          <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{r.title}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#6A6A72" }}>{fmtTime(r.time)} · {serves} servings · {r.cal != null ? `${r.cal} kcal` : "Nutrition n/a"}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#E11D24", marginTop: 4 }}>Cooked with SERVD</div>
          </div>
        </div>
        <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className="sv-btn-dark" style={{ height: 58, fontSize: 17, fontWeight: 700 }}>Send on WhatsApp</a>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="sv-btn-ghost" onClick={downloadPdf} disabled={pdfBusy} style={{ flex: 1, height: 52, fontSize: 15, fontWeight: 700 }}>{pdfBusy ? "Preparing…" : "Download PDF"}</button>
          <button className="sv-btn-ghost" onClick={copy} style={{ flex: 1, height: 52, fontSize: 15, fontWeight: 700, borderColor: copied ? "#121212" : undefined, color: copied ? "#E11D24" : undefined }}>{copied ? "Copied ✓" : "Copy recipe"}</button>
        </div>
      </div>
    </div>
  );
}
