"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { scanPantryImage } from "@/actions/pantry.actions";
import { getRecipesByPantryIngredients } from "@/actions/recipe.actions";
import { useKitchen } from "@/components/servd/KitchenProvider";
import { Img } from "@/components/servd/Plate";
import { IconCamera, IconCheck, IconPlus, IconScan, IconSparkle, IconUpload, IconX } from "@/components/servd/icons";
import { cookHref } from "@/lib/servd/recipe";
import { anim, motionOff, SPRING, stagger, UP } from "@/lib/servd/motion";

const SAMPLE = "/pantry-sample.webp";

// Shrink a photo so it fits comfortably under the server action body limit.
async function toJpeg(src, max = 1280) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  await img.decode();
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.round(img.naturalWidth * k);
  c.height = Math.round(img.naturalHeight * k);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  const blob = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.85));
  return new File([blob], "pantry.jpg", { type: "image/jpeg" });
}

export default function PantryPage() {
  const k = useKitchen();
  const rootRef = useRef(null), videoRef = useRef(null), camInputRef = useRef(null), photoRef = useRef(null), flashRef = useRef(null), lineRef = useRef(null);
  const streamRef = useRef(null), objUrlRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [camError, setCamError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [scan, setScan] = useState("idle"); // idle | scanning | done
  const [detected, setDetected] = useState([]);
  const [ideas, setIdeas] = useState(null);
  const [ideasLoading, setIdeasLoading] = useState(false);

  useEffect(() => {
    stagger(rootRef.current, "[data-fade]", UP(16), { duration: 650, delay: 80, step: 90 });
    if (window.location.hash === "#cook-with") setTimeout(() => document.getElementById("cook-with")?.scrollIntoView({ behavior: "smooth" }), 300);
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);
  useEffect(() => () => {
    stopCamera();
    if (objUrlRef.current) URL.revokeObjectURL(objUrlRef.current);
  }, [stopCamera]);

  // scanning / results animations
  useEffect(() => {
    const root = rootRef.current;
    if (scan === "scanning" && lineRef.current && !motionOff())
      lineRef.current.animate([{ top: "0%" }, { top: "calc(100% - 3px)" }], { duration: 1100, iterations: Infinity, direction: "alternate", easing: "ease-in-out" });
    if (scan === "done") {
      stagger(root, "[data-marker]", [{ opacity: 0, transform: "scale(.4)" }, { opacity: 1, transform: "none" }], { duration: 550, step: 110, easing: SPRING });
      stagger(root, "[data-row]", [{ opacity: 0, transform: "translateX(24px)" }, { opacity: 1, transform: "none" }], { duration: 550, step: 90 });
    }
  }, [scan]);

  const runScan = async (src) => {
    if (scan === "scanning") return;
    setScan("scanning");
    try {
      const file = await toJpeg(src || photo || SAMPLE);
      const fd = new FormData();
      fd.append("image", file);
      const res = await scanPantryImage(fd);
      setDetected(res.ingredients);
      setScan("done");
    } catch (e) {
      toast.error(e.message || "Scan failed. Try a clearer photo.");
      setScan("idle");
    }
  };

  const takePhoto = (url) => {
    stopCamera();
    if (objUrlRef.current && objUrlRef.current !== url) URL.revokeObjectURL(objUrlRef.current);
    if (url.startsWith("blob:")) objUrlRef.current = url;
    setPhoto(url);
    setCameraOn(false);
    setDragging(false);
    setCamError("");
    setScan("idle");
    setDetected([]);
    requestAnimationFrame(() => anim(photoRef.current, [{ opacity: 0, transform: "scale(1.08)" }, { opacity: 1, transform: "none" }], { duration: 700 }));
    setTimeout(() => runScan(url), 350);
  };
  const onFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f && f.type.startsWith("image/")) takePhoto(URL.createObjectURL(f));
  };
  const openCamera = async () => {
    if (cameraOn) return;
    if (!navigator.mediaDevices?.getUserMedia) return camInputRef.current?.click();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      setCameraOn(true);
      setCamError("");
      setScan("idle");
      requestAnimationFrame(() => {
        const v = videoRef.current;
        if (v) { v.srcObject = stream; v.play?.().catch(() => {}); }
      });
    } catch {
      setCamError("Camera blocked here — choose a photo instead");
      camInputRef.current?.click();
    }
  };
  const closeCamera = () => { stopCamera(); setCameraOn(false); };
  const capture = () => {
    const v = videoRef.current;
    if (!v?.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    flashRef.current?.animate?.([{ opacity: 0 }, { opacity: 0.95 }, { opacity: 0 }], { duration: 420, easing: "ease-out" });
    takePhoto(c.toDataURL("image/jpeg", 0.9));
  };

  const addAll = () => {
    const rows = rootRef.current?.querySelectorAll("[data-row]") || [];
    const missing = detected.map((d, i) => ({ d, img: rows[i]?.querySelector("img") })).filter(({ d }) => !k.inPantry(d.name));
    if (missing.length > 1) k.addToPantry(missing.map(({ d }) => ({ name: d.name, quantity: d.quantity, shelfLifeDays: d.shelfLifeDays })));
    else if (missing.length === 1) k.addToPantry([{ name: missing[0].d.name, quantity: missing[0].d.quantity, shelfLifeDays: missing[0].d.shelfLifeDays }], { srcImg: missing[0].img });
  };

  const findIdeas = async () => {
    setIdeasLoading(true);
    try {
      const r = await getRecipesByPantryIngredients();
      if (!r.success) toast.info(r.message);
      setIdeas(r.recipes || []);
      requestAnimationFrame(() => stagger(document.getElementById("cook-with"), "[data-card]", UP(22), { duration: 650, step: 70 }));
    } catch (e) {
      toast.error(e.message || "Couldn't find recipes right now");
    } finally {
      setIdeasLoading(false);
    }
  };

  const canAddAll = scan === "done" && detected.some((d) => !k.inPantry(d.name));
  const hint = camError || (cameraOn ? "Frame your shelves, then tap the shutter" : photo ? "Your photo · scanned automatically" : "Sample photo · or drag an image here");

  return (
    <div ref={rootRef} data-screen="1" style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      <div data-fade="1" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h2 className="sv-h2">Scan your pantry</h2>
        <p className="sv-lead">Snap your fridge. We&apos;ll work out what&apos;s in it — and what&apos;s for dinner.</p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 28, alignItems: "flex-start" }}>
        <div data-fade="1" style={{ flex: "1 1 400px", minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            onDragOver={(e) => { e.preventDefault(); if (!dragging && !cameraOn) setDragging(true); }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer?.files?.[0];
              if (f && f.type.startsWith("image/")) takePhoto(URL.createObjectURL(f));
              else setDragging(false);
            }}
            style={{ position: "relative", aspectRatio: "4/3", borderRadius: 26, overflow: "hidden", background: "#121212" }}
          >
            {!cameraOn && (
              // eslint-disable-next-line @next/next/no-img-element
              <img ref={photoRef} src={photo || SAMPLE} alt="Pantry photo" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            )}
            {cameraOn && (
              <>
                <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                <div style={{ position: "absolute", inset: 18, borderRadius: 18, border: "2px solid rgba(255,255,255,.55)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", left: 18, top: 18, background: "#E11D24", color: "#fff", borderRadius: 999, padding: "7px 14px", fontSize: 13, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>Live</div>
                <button onClick={closeCamera} title="Close camera" style={{ position: "absolute", right: 18, top: 18, width: 40, height: 40, padding: 0, border: 0, borderRadius: "50%", background: "rgba(255,255,255,.92)", display: "grid", placeItems: "center" }}><IconX size={14} stroke="#121212" /></button>
                <button onClick={capture} title="Take photo" style={{ position: "absolute", left: "50%", bottom: 22, marginLeft: -38, width: 76, height: 76, padding: 0, border: "4px solid #fff", borderRadius: "50%", background: "transparent", display: "grid", placeItems: "center" }}>
                  <span style={{ width: 58, height: 58, borderRadius: "50%", background: "#E11D24" }} />
                </button>
              </>
            )}
            {dragging && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(18,18,18,.6)", display: "grid", placeItems: "center", pointerEvents: "none" }}>
                <div style={{ border: "2px dashed #fff", borderRadius: 22, padding: "28px 36px", color: "#fff", fontSize: 20, fontWeight: 700 }}>Drop photo to scan</div>
              </div>
            )}
            <div ref={flashRef} style={{ position: "absolute", inset: 0, background: "#fff", opacity: 0, pointerEvents: "none" }} />
            {scan === "scanning" && (
              <>
                <div style={{ position: "absolute", inset: 0, background: "rgba(18,18,18,.28)" }} />
                <div ref={lineRef} style={{ position: "absolute", left: 0, right: 0, top: 0, height: 3, background: "#E11D24", boxShadow: "0 0 28px 8px rgba(225,29,36,.55)" }} />
                <div style={{ position: "absolute", left: 18, bottom: 18, background: "#fff", borderRadius: 999, padding: "10px 18px", fontSize: 15, fontWeight: 700 }}>Identifying ingredients…</div>
              </>
            )}
            {scan === "done" && !cameraOn &&
              detected.filter((d) => d.x != null && d.y != null).map((d) => (
                <div key={d.name} data-marker="1" style={{ position: "absolute", left: `${d.x}%`, top: `${d.y}%`, display: "flex", alignItems: "center", gap: 8, transformOrigin: "0 50%" }}>
                  <span style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", boxShadow: "0 0 0 4px rgba(225,29,36,.85)" }} />
                  <span style={{ background: "#fff", borderRadius: 999, padding: "6px 12px", fontSize: 14, fontWeight: 700, boxShadow: "0 8px 20px -8px rgba(0,0,0,.4)", whiteSpace: "nowrap" }}>{d.name} <span style={{ color: "#E11D24" }}>{d.confidence}%</span></span>
                </div>
              ))}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <label className="sv-btn-ghost" style={{ height: 48, padding: "0 20px", fontSize: 16, gap: 9, cursor: "pointer" }}>
              <input type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
              <IconUpload />Upload photo
            </label>
            <button onClick={openCamera} className="sv-btn-ghost" style={{ height: 48, padding: "0 20px", fontSize: 16, gap: 9, borderColor: cameraOn ? "#121212" : undefined, background: cameraOn ? "#121212" : undefined, color: cameraOn ? "#fff" : undefined }}>
              <IconCamera />Use camera
            </button>
            <input ref={camInputRef} type="file" accept="image/*" capture="environment" onChange={onFile} style={{ display: "none" }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: camError ? "#E11D24" : "#6A6A72" }}>{hint}</div>
          </div>
        </div>

        <div style={{ flex: "1 1 300px", minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="sv-eyebrow" style={{ display: "flex", justifyContent: "space-between" }}><span>Detected</span><span>{scan === "done" ? `${detected.length} items` : "—"}</span></div>
          {scan === "idle" && (
            <div style={{ border: "1.5px dashed #D2D2D8", borderRadius: 20, padding: 26, fontSize: 16, lineHeight: 1.5, color: "#6A6A72" }}>
              Nothing scanned yet. Tap scan and every ingredient we spot will land here, ready to add.
            </div>
          )}
          {scan === "scanning" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[0, 1, 2].map((i) => <div key={i} className="sv-skel" style={{ height: 72, borderRadius: 20, animationDelay: `${i * 150}ms` }} />)}
            </div>
          )}
          {scan === "done" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 420, overflowY: "auto" }}>
              {detected.map((d) => {
                const have = k.inPantry(d.name);
                return (
                  <div key={d.name} data-row="1" style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 14px 10px 10px", borderRadius: 20, border: "1.5px dashed #D2D2D8", background: "#fff" }}>
                    <div style={{ width: 50, height: 50, flex: "none", borderRadius: "50%", background: "#F4F4F6", display: "grid", placeItems: "center" }}><Img ingredient={d.name} style={{ width: 38, height: 38, objectFit: "contain" }} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 17, fontWeight: 600 }}>{d.name}</div>
                      <div style={{ fontSize: 14, color: "#6A6A72" }}>{[d.quantity, `${d.confidence}% sure`].filter(Boolean).join(" · ")}</div>
                    </div>
                    {have ? (
                      <span style={{ width: 36, height: 36, borderRadius: "50%", background: "#121212", display: "grid", placeItems: "center" }}><IconCheck size={14} sw={3} /></span>
                    ) : (
                      <button title="Add to pantry" onClick={(e) => k.addToPantry([{ name: d.name, quantity: d.quantity, shelfLifeDays: d.shelfLifeDays }], { srcImg: e.currentTarget.closest("[data-row]").querySelector("img") })} className="sv-circle-btn" style={{ width: 36, height: 36, background: "#E11D24" }}>
                        <IconPlus size={14} sw={3} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="sv-btn-dark" onClick={() => runScan()} disabled={cameraOn || scan === "scanning"} style={{ flex: "1 1 auto", height: 56, fontSize: 17, opacity: scan === "scanning" || cameraOn ? 0.6 : 1 }}>
              <IconScan />{scan === "idle" ? "Scan with AI" : scan === "scanning" ? "Scanning…" : "Scan again"}
            </button>
            {canAddAll && <button onClick={addAll} className="sv-outline-dark" style={{ height: 56, padding: "0 24px", borderRadius: 999, border: "1.5px solid #121212", background: "transparent", fontSize: 17, fontWeight: 600 }}>Add all</button>}
          </div>
          <div style={{ fontSize: 13, color: "#6A6A72" }}>Free plan: {k.isPro ? "unlimited scans" : "10 scans a month"} · use-by dates are estimated by AI</div>
        </div>
      </div>

      <div id="cook-with" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div className="sv-eyebrow">Cook with what you have</div>
          {ideas && <button className="sv-link-btn" onClick={findIdeas} disabled={ideasLoading}>{ideasLoading ? "Thinking…" : "Refresh ideas"}</button>}
        </div>
        {!ideas && (
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", border: "1.5px dashed #D2D2D8", borderRadius: 22, padding: "18px 18px 18px 22px" }}>
            <span style={{ flex: "1 1 240px", fontSize: 16, color: "#3A3A40" }}>Our AI chef will suggest dishes you can make from the {k.pantry.length} items in your pantry.</span>
            <button className="sv-btn-red" onClick={findIdeas} disabled={ideasLoading || !k.pantry.length} style={{ height: 52, padding: "0 22px", fontSize: 16, opacity: k.pantry.length ? 1 : 0.5 }}>
              <IconSparkle size={16} />{ideasLoading ? "Finding recipes…" : "What can I cook?"}
            </button>
          </div>
        )}
        {ideas && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(240px, 100%), 1fr))", gap: 14 }}>
            {ideas.map((x) => (
              <Link key={x.title} href={cookHref(x.title)} data-card="1" className="sv-dash-card" style={{ display: "flex", flexDirection: "column", gap: 8, padding: 16, borderRadius: 22 }}>
                <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.2, color: "#121212" }}>{x.title}</div>
                <div className="sv-clamp2" style={{ fontSize: 14, color: "#6A6A72", lineHeight: 1.4 }}>{x.description}</div>
                <div style={{ height: 6, borderRadius: 6, background: "#E6E6EA", overflow: "hidden", marginTop: 4 }}><div style={{ height: "100%", width: `${x.matchPercentage}%`, background: "#E11D24", borderRadius: 6, transition: "width .8s cubic-bezier(.22,1,.36,1)" }} /></div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700 }}>
                  <span style={{ color: "#E11D24" }}>{x.matchPercentage}% match</span>
                  <span style={{ color: "#6A6A72" }}>{(Number(x.prepTime) || 0) + (Number(x.cookTime) || 0)} min</span>
                </div>
                {x.missingIngredients?.length > 0 && <div style={{ fontSize: 13, color: "#6A6A72" }}>Needs: {x.missingIngredients.join(", ")}</div>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
