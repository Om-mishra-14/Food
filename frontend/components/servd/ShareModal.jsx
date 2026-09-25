"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Img } from "./Plate";
import { IconX } from "./icons";
import { fmtTime, heroHref, recipeText } from "@/lib/servd/recipe";
import { anim } from "@/lib/servd/motion";

export default function ShareModal({ recipe: r, serves, swaps, onClose }) {
  const [copied, setCopied] = useState(null);
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

  const link = typeof window !== "undefined" ? window.location.origin + heroHref(r) : "";
  const text = recipeText(r, serves, swaps, { link });
  const waText = recipeText(r, serves, swaps, { rich: true, link });
  const fileName = `${r.title.replace(/[^\w]+/g, "-").toLowerCase()}.pdf`;

  const writeClipboard = (value) =>
    (navigator.clipboard ? navigator.clipboard.writeText(value) : Promise.reject()).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch {}
      ta.remove();
    });
  const copy = (what) => writeClipboard(what === "link" ? link : text).then(() => setCopied(what));

  const buildPdf = async () => {
    const [{ pdf }, { RecipePDF }] = await Promise.all([import("@react-pdf/renderer"), import("@/components/RecipePDF")]);
    return pdf(<RecipePDF recipe={r} serves={serves} swaps={swaps} link={link} />).toBlob();
  };
  const downloadPdf = async () => {
    setPdfBusy(true);
    try {
      const url = URL.createObjectURL(await buildPdf());
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't build the PDF. Please try again.");
    } finally {
      setPdfBusy(false);
    }
  };
  // Phones: open the system share sheet with the PDF attached (falls back to text + link).
  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;
  const nativeShare = async () => {
    setPdfBusy(true);
    try {
      const file = new File([await buildPdf()], fileName, { type: "application/pdf" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: r.title, text: `${r.title} — cooked with Fridge2Fork` });
      else await navigator.share({ title: r.title, text, url: link });
    } catch (e) {
      if (e?.name !== "AbortError") toast.error("Sharing isn't available here — try Download PDF.");
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
            <div style={{ fontSize: 13, fontWeight: 800, color: "#E11D24", marginTop: 4 }}>Cooked with Fridge2Fork</div>
          </div>
        </div>
        <a href={`https://wa.me/?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener noreferrer" className="sv-btn-dark" style={{ height: 58, fontSize: 17, fontWeight: 700 }}>Send on WhatsApp</a>
        {canNativeShare && (
          <button className="sv-btn-red" onClick={nativeShare} disabled={pdfBusy} style={{ height: 54, fontSize: 16 }}>{pdfBusy ? "Preparing…" : "Share PDF…"}</button>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="sv-btn-ghost" onClick={downloadPdf} disabled={pdfBusy} style={{ flex: "1 1 120px", height: 50, fontSize: 15, fontWeight: 700 }}>{pdfBusy && !canNativeShare ? "Preparing…" : "Download PDF"}</button>
          <button className="sv-btn-ghost" onClick={() => copy("text")} style={{ flex: "1 1 120px", height: 50, fontSize: 15, fontWeight: 700, borderColor: copied === "text" ? "#121212" : undefined, color: copied === "text" ? "#E11D24" : undefined }}>{copied === "text" ? "Copied ✓" : "Copy recipe"}</button>
          <button className="sv-btn-ghost" onClick={() => copy("link")} style={{ flex: "1 1 120px", height: 50, fontSize: 15, fontWeight: 700, borderColor: copied === "link" ? "#121212" : undefined, color: copied === "link" ? "#E11D24" : undefined }}>{copied === "link" ? "Link copied ✓" : "Copy link"}</button>
        </div>
      </div>
    </div>
  );
}
