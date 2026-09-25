"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useKitchen } from "./KitchenProvider";
import Plate from "./Plate";
import { scrollToPricing } from "./AppShell";
import { IconArrowRight, IconCamera, IconChef, IconCheck, IconCookbook, IconFlame, IconPlus, IconSearch, IconSparkle, IconStar, IconX } from "./icons";
import { anim, heroAnim, openHeight, useReveal, useSpins } from "@/lib/servd/motion";
import useProUpgrade from "@/hooks/use-pro-upgrade";

const STATS = [["10/mo", "Free Scans"], ["1M+", "Recipes Generated"], ["₹0", "Cost to Start"], ["4.9", "App Store Rating"]];
const FEATURES = [
  { Icon: IconCamera, limit: "10 scans/mo free", title: "Scan Your Pantry", text: "Photo recognition that actually works. Know what you have instantly." },
  { Icon: IconChef, limit: "5 meals/mo free", title: "AI Chef Suggestions", text: "Turn random ingredients into a gourmet meal. Zero food waste." },
  { Icon: IconSearch, limit: "Unlimited searches", title: "Search Any Dish", text: "Find any recipe instantly. Filter by cuisine, time, or dietary needs." },
  { Icon: IconCookbook, limit: "3 saves/mo free", title: "Digital Cookbook", text: "Save your favorites. Export as PDF. Share with family." },
];
const STEPS = [["01", "Scan", "Point camera at fridge. AI identifies ingredients."], ["02", "Select", "Choose a generated recipe based on your mood."], ["03", "Savor", "Follow simple steps. Eat delicious food."]];
const FREE = [["5 AI recipes per day", 1], ["Pantry tracker", 1], ["Recipe browsing", 1], ["Basic search", 1], ["Meal planner", 0], ["Nutrition analysis", 0], ["PDF export", 0]];
const PRO = ["Unlimited AI recipes", "Pantry tracker", "Full meal planner", "Nutrition analysis", "PDF export", "Priority AI model", "Lifetime recipe history"];
const COMPARISON = [["AI Recipes", "5/day", "Unlimited"], ["Pantry Tracker", true, true], ["Meal Planner", false, true], ["Nutrition Analysis", false, true], ["Export as PDF", false, true], ["Priority AI Model", false, true], ["Recipe History", "Last 7 days", "Forever"]];
const TESTIMONIALS = [
  ["PS", "#121212", "Priya Sharma", "@priyacooks", "The AI recipe suggestions are mind-blowing. Took my ₹50 worth of veggies and made restaurant-level food! Pro is totally worth it."],
  ["RM", "#E11D24", "Rohan Mehta", "@rohaneats", "The PDF export for meal plans + nutrition tracking has completely transformed how I cook for the week. Genuinely saves hours."],
  ["AK", "#121212", "Aisha Khan", "@aishakitchen", "Upgraded to Pro last month and never looked back. The unlimited AI recipes feature alone is worth every rupee."],
];
const FAQ = [
  ["Can I cancel anytime?", "Yes! You can cancel your Pro subscription at any time. You'll continue to have Pro access until the end of your billing period."],
  ["What payment methods are accepted?", "We accept all major credit/debit cards, UPI, net banking, and wallets through Razorpay's secure checkout."],
  ["Is there a free trial for Pro?", "Currently we don't offer a free trial, but our Free plan lets you try AI recipes (5/day) before upgrading."],
  ["What happens to my data if I downgrade?", "Your data is always safe. Pro features become unavailable but all your saved recipes and pantry items remain intact."],
];

const hoverCard = "sv-dash-card";
const Check = ({ c = "#121212", s = 16 }) => <IconCheck size={s} stroke={c} sw={3} />;

export default function HomeScreen() {
  const ref = useRef(null);
  const router = useRouter();
  const { isPro, afterUpgrade } = useKitchen();
  const [billing, setBilling] = useState("monthly");
  const [faq, setFaq] = useState(null);
  const { upgrade, loading } = useProUpgrade({ onUpgraded: afterUpgrade });
  const priceRef = useRef(null), faqRef = useRef(null);
  const firstBill = useRef(true);

  useSpins(ref);
  useReveal(ref);
  useEffect(() => {
    heroAnim(ref.current);
    if (window.location.hash === "#pricing") setTimeout(scrollToPricing, 150);
  }, []);
  useEffect(() => {
    if (firstBill.current) { firstBill.current = false; return; }
    anim(priceRef.current, [{ transform: "translateY(100%)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 550 });
  }, [billing]);
  useEffect(() => { if (faq != null) openHeight(faqRef.current); }, [faq]);

  const yearly = billing === "yearly";
  const upgradeLabel = isPro ? "You're on Pro" : loading ? "Opening checkout…" : "Upgrade to Pro →";
  const onUpgrade = () => !isPro && !loading && upgrade(billing);

  return (
    <div className="sv-body-row">
      <main className="sv-main">
        <div ref={ref} data-screen="1" style={{ display: "flex", flexDirection: "column", gap: 36 }}>
          {/* hero */}
          <section style={{ display: "flex", flexWrap: "wrap", gap: 48, alignItems: "center", padding: "30px 12px 20px" }}>
            <div style={{ flex: "1 1 460px", minWidth: 0, display: "flex", flexDirection: "column", gap: 26 }}>
              <div data-fade="1" style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 8, height: 38, padding: "0 16px", borderRadius: 999, border: "1.5px solid #E11D24", background: "#fff", color: "#E11D24", fontSize: 13, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase" }}>
                <IconFlame size={15} />#1 AI Cooking Assistant
              </div>
              <h1 style={{ margin: 0, fontSize: "clamp(44px, 9vw, 86px)", lineHeight: 0.94, fontWeight: 700, letterSpacing: "-.055em", display: "flex", flexWrap: "wrap", columnGap: ".2em" }}>
                {["Turn", "your", "leftovers", "into", "masterpieces."].map((w) => (
                  <span key={w} style={{ display: "inline-block", overflow: "hidden", paddingBottom: w === "leftovers" ? ".1em" : ".06em" }}>
                    <span data-w="1" style={w === "leftovers" ? { display: "inline-block", color: "#E11D24", fontStyle: "italic", textDecoration: "underline", textDecorationThickness: 5, textUnderlineOffset: 10 } : { display: "inline-block" }}>{w}</span>
                  </span>
                ))}
              </h1>
              <p data-fade="1" style={{ margin: 0, fontSize: 22, lineHeight: 1.45, color: "#3A3A40", maxWidth: 520, textWrap: "pretty" }}>
                Snap a photo of your fridge. We&apos;ll tell you what to cook. Save money, reduce waste, and eat better tonight.
              </p>
              <div data-fade="1" style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                <button className="sv-btn-dark" onClick={() => router.push("/dashboard")} style={{ height: 64, padding: "0 10px 0 32px", fontSize: 19, gap: 20 }}>
                  Start Cooking Free
                  <span style={{ width: 46, height: 46, borderRadius: "50%", background: "#E11D24", display: "grid", placeItems: "center" }}><IconArrowRight /></span>
                </button>
                <div style={{ fontSize: 16, color: "#6A6A72" }}><b style={{ color: "#121212" }}>10k+ cooks</b> joined last month</div>
              </div>
            </div>
            <div style={{ flex: "1 1 400px", minWidth: "min(280px, 100%)", maxWidth: 540, position: "relative", aspectRatio: 1 }}>
              <Plate src="https://www.themealdb.com/images/media/meals/ustsqw1468250014.jpg" alt="Rustic tomato basil pasta" inset={26} shadow="0 50px 90px -40px rgba(40,20,10,.5), inset 0 0 0 16px #F2F2F4" />
              <div data-chip="1" style={{ position: "absolute", left: -10, bottom: 26, background: "#fff", borderRadius: 24, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10, boxShadow: "0 24px 50px -20px rgba(0,0,0,.35)", minWidth: "min(270px, 78vw)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>Rustic Tomato Basil Pasta</div>
                    <div style={{ display: "flex", gap: 2, marginTop: 4 }}>{[0, 1, 2, 3, 4].map((i) => <IconStar key={i} />)}</div>
                  </div>
                  <span style={{ background: "#121212", color: "#fff", borderRadius: 999, padding: "6px 12px", fontSize: 12, fontWeight: 800, letterSpacing: ".06em", whiteSpace: "nowrap" }}>98% MATCH</span>
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 14, fontWeight: 600, color: "#6A6A72" }}><span>25 mins</span><span>2 servings</span></div>
              </div>
            </div>
          </section>

          {/* stats */}
          <section data-reveal="1" style={{ background: "#121212", borderRadius: 30, padding: "40px 36px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(160px, 100%), 1fr))", gap: 28, textAlign: "center" }}>
            {STATS.map(([v, l]) => (
              <div key={l} data-rchild="1">
                <div style={{ fontSize: "clamp(32px, 6vw, 48px)", fontWeight: 700, color: "#fff", letterSpacing: "-.03em" }}>{v}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#FF5A5F", letterSpacing: ".1em", textTransform: "uppercase" }}>{l}</div>
              </div>
            ))}
          </section>

          {/* smart kitchen */}
          <section data-reveal="1" style={{ display: "flex", flexDirection: "column", gap: 28, padding: "20px 12px" }}>
            <div data-rchild="1">
              <h2 style={{ margin: "0 0 8px", fontSize: "clamp(34px, 6.5vw, 56px)", fontWeight: 700, letterSpacing: "-.045em", lineHeight: 1 }}>Your Smart Kitchen</h2>
              <p style={{ margin: 0, fontSize: 20, color: "#3A3A40" }}>Everything you need to master your meal prep.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", gap: 16 }}>
              {FEATURES.map(({ Icon, limit, title, text }) => (
                <div key={title} data-rchild="1" className={hoverCard} style={{ borderRadius: 26, padding: "clamp(20px, 4vw, 30px)", display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <span style={{ width: 56, height: 56, borderRadius: "50%", background: "#fff", display: "grid", placeItems: "center", boxShadow: "0 8px 18px -10px rgba(0,0,0,.3)" }}><Icon size={24} stroke="#E11D24" sw={1.9} /></span>
                    <span style={{ background: "#EDEDF0", borderRadius: 999, padding: "6px 12px", fontSize: 12, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#3A3A40" }}>{limit}</span>
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.02em" }}>{title}</div>
                  <div style={{ fontSize: 18, lineHeight: 1.5, color: "#3A3A40" }}>{text}</div>
                </div>
              ))}
            </div>
          </section>

          {/* 3 steps */}
          <section data-reveal="1" style={{ background: "#121212", color: "#fff", borderRadius: 32, padding: "clamp(26px, 5vw, 52px) clamp(20px, 5vw, 48px)", display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 data-rchild="1" style={{ margin: "0 0 26px", fontSize: "clamp(34px, 6.5vw, 56px)", fontWeight: 700, letterSpacing: "-.045em", lineHeight: 1 }}>Cook in 3 Steps</h2>
            {STEPS.map(([n, t, d], i) => (
              <div key={n}>
                {i > 0 && <div style={{ borderTop: "1.5px dashed rgba(255,255,255,.18)" }} />}
                <div data-rchild="1" style={{ display: "flex", gap: 28, alignItems: "flex-start", padding: "22px 0" }}>
                  <span style={{ fontSize: "clamp(46px, 10vw, 72px)", fontWeight: 800, lineHeight: 0.85, color: "#FF5A5F", letterSpacing: "-.04em", minWidth: "clamp(56px, 13vw, 110px)" }}>{n}</span>
                  <div>
                    <div style={{ fontSize: "clamp(24px, 4vw, 30px)", fontWeight: 700, marginBottom: 6 }}>{t}</div>
                    <div style={{ fontSize: 19, color: "#B9B9C0" }}>{d}</div>
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* pricing */}
          <section id="pricing" style={{ display: "flex", flexDirection: "column", gap: 40, padding: "24px 12px 8px" }}>
            <div data-reveal="1" style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: "clamp(40px, 7vw, 60px)", fontWeight: 700, letterSpacing: "-.045em", lineHeight: 1 }}>Simple Pricing</h2>
              <p style={{ margin: 0, fontSize: 20, color: "#3A3A40" }}>Start free. Upgrade when you&apos;re ready to cook like a pro.</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 18, fontSize: 16, fontWeight: 700 }}>
                <span style={{ color: yearly ? "#9A9AA2" : "#121212", transition: "color .3s" }}>Monthly</span>
                <button onClick={() => setBilling(yearly ? "monthly" : "yearly")} aria-label="Toggle billing period" style={{ position: "relative", width: 62, height: 34, border: 0, borderRadius: 999, background: yearly ? "#E11D24" : "#C9C9D0", padding: 0, transition: "background .35s" }}>
                  <span style={{ position: "absolute", top: 4, left: 4, width: 26, height: 26, borderRadius: "50%", background: "#fff", boxShadow: "0 2px 6px rgba(0,0,0,.25)", transform: `translateX(${yearly ? 28 : 0}px)`, transition: "transform .45s cubic-bezier(.34,1.56,.64,1)" }} />
                </button>
                <span style={{ color: yearly ? "#121212" : "#9A9AA2", transition: "color .3s" }}>Yearly</span>
                <span style={{ background: "#E11D24", color: "#fff", borderRadius: 999, padding: "5px 11px", fontSize: 12, fontWeight: 800, opacity: yearly ? 1 : 0, transform: `scale(${yearly ? 1 : 0.6})`, transition: "all .4s cubic-bezier(.34,1.56,.64,1)" }}>Save 20%</span>
              </div>
            </div>

            <div data-reveal="1" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", gap: 18, maxWidth: 980, width: "100%", margin: "0 auto" }}>
              <div data-rchild="1" style={{ border: "1.5px dashed #D2D2D8", borderRadius: 30, padding: "clamp(22px, 4vw, 34px)", display: "flex", flexDirection: "column", gap: 24 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color: "#6A6A72" }}>Free</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}><span style={{ fontSize: "clamp(40px, 7vw, 60px)", fontWeight: 700, letterSpacing: "-.04em" }}>₹0</span><span style={{ fontSize: 17, color: "#6A6A72", fontWeight: 600 }}>/forever</span></div>
                  <div style={{ fontSize: 16, color: "#3A3A40", marginTop: 6 }}>Perfect to get started. No credit card needed.</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 16, fontWeight: 500 }}>
                  {FREE.map(([f, ok]) => (
                    <div key={f} style={{ display: "flex", gap: 10, alignItems: "center", ...(ok ? {} : { color: "#9A9AA2", textDecoration: "line-through" }) }}>
                      {ok ? <Check /> : <IconX size={16} stroke="#B5B5BC" />}{f}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: "auto", height: 56, borderRadius: 999, background: "#EDEDF0", display: "grid", placeItems: "center", fontSize: 16, fontWeight: 700, color: "#3A3A40" }}>{isPro ? "Your previous plan" : "Current plan"}</div>
              </div>
              <div data-rchild="1" style={{ position: "relative", background: "#121212", color: "#fff", borderRadius: 30, padding: "clamp(22px, 4vw, 34px)", display: "flex", flexDirection: "column", gap: 24, boxShadow: "0 40px 70px -40px rgba(225,29,36,.6)" }}>
                <span style={{ position: "absolute", top: -15, left: "50%", transform: "translateX(-50%)", background: "#E11D24", color: "#fff", borderRadius: 999, padding: "7px 16px", fontSize: 13, fontWeight: 800, whiteSpace: "nowrap" }}>Most Popular</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color: "#FF5A5F" }}>Pro Chef</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
                    <span style={{ overflow: "hidden", display: "inline-block" }}><span ref={priceRef} style={{ display: "inline-block", fontSize: "clamp(40px, 7vw, 60px)", fontWeight: 700, letterSpacing: "-.04em" }}>{yearly ? "₹159" : "₹199"}</span></span>
                    <span style={{ fontSize: 17, color: "#B9B9C0", fontWeight: 600 }}>/mo</span>
                  </div>
                  <div style={{ fontSize: 16, color: "#B9B9C0", marginTop: 6 }}>{yearly ? "Billed ₹1,908/year · saves ₹492" : "Everything to master your kitchen."}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 16, fontWeight: 500 }}>
                  {PRO.map((f) => <div key={f} style={{ display: "flex", gap: 10, alignItems: "center" }}><Check c="#FF5A5F" />{f}</div>)}
                </div>
                <button className="sv-btn-red" onClick={onUpgrade} disabled={isPro || loading} style={{ marginTop: "auto", height: 56, fontSize: 17 }}>{upgradeLabel}</button>
              </div>
            </div>

            <div data-reveal="1" style={{ maxWidth: 980, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
              <h3 style={{ margin: 0, textAlign: "center", fontSize: "clamp(24px, 4vw, 30px)", fontWeight: 700, letterSpacing: "-.03em" }}>Full Comparison</h3>
              <div style={{ background: "#fff", borderRadius: 26, overflow: "hidden", border: "1.5px dashed #D2D2D8" }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", padding: "14px clamp(14px, 3vw, 26px)", fontSize: 13, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "#6A6A72", borderBottom: "1.5px dashed #E1E1E6" }}>
                  <span>Feature</span><span style={{ textAlign: "center" }}>Free</span><span style={{ textAlign: "center", color: "#E11D24" }}>Pro</span>
                </div>
                {COMPARISON.map(([f, a, b], i) => (
                  <div key={f} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", alignItems: "center", padding: "14px clamp(14px, 3vw, 26px)", fontSize: 16, background: i % 2 ? "#FAFAFB" : "#fff" }}>
                    <span style={{ fontWeight: 600 }}>{f}</span>
                    <span style={{ display: "flex", justifyContent: "center", fontWeight: 600, color: "#3A3A40" }}>{typeof a === "string" ? a : a ? <Check s={18} /> : <IconX size={16} stroke="#C4C4CB" />}</span>
                    <span style={{ display: "flex", justifyContent: "center", fontWeight: 700, color: "#E11D24" }}>{typeof b === "string" ? b : <Check c="#E11D24" s={18} />}</span>
                  </div>
                ))}
              </div>
            </div>

            <div data-reveal="1" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <h3 style={{ margin: 0, textAlign: "center", fontSize: "clamp(24px, 4vw, 30px)", fontWeight: 700, letterSpacing: "-.03em" }}>Loved by home chefs</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))", gap: 16 }}>
                {TESTIMONIALS.map(([ini, bg, name, handle, text]) => (
                  <div key={name} data-rchild="1" className={hoverCard} style={{ borderRadius: 26, padding: 26, display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ fontSize: 15, color: "#E11D24", letterSpacing: ".2em" }}>★★★★★</div>
                    <p style={{ margin: 0, fontSize: 17, lineHeight: 1.55, color: "#3A3A40" }}>“{text}”</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: "auto" }}>
                      <span style={{ width: 42, height: 42, borderRadius: "50%", background: bg, color: "#fff", display: "grid", placeItems: "center", fontSize: 14, fontWeight: 800 }}>{ini}</span>
                      <div><div style={{ fontSize: 15, fontWeight: 700 }}>{name}</div><div style={{ fontSize: 14, color: "#6A6A72" }}>{handle}</div></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div data-reveal="1" style={{ maxWidth: 760, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
              <h3 style={{ margin: "0 0 6px", textAlign: "center", fontSize: "clamp(24px, 4vw, 30px)", fontWeight: 700, letterSpacing: "-.03em" }}>FAQ</h3>
              {FAQ.map(([q, a], i) => {
                const open = faq === i;
                return (
                  <div key={q} style={{ background: "#fff", borderRadius: 20, overflow: "hidden", border: `1.5px dashed ${open ? "#E11D24" : "#E1E1E6"}`, transition: "border-color .3s" }}>
                    <button onClick={() => setFaq(open ? null : i)} aria-expanded={open} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "20px 24px", border: 0, background: "transparent", textAlign: "left", fontSize: 17, fontWeight: 700, color: "#121212" }}>
                      {q}
                      <span style={{ width: 32, height: 32, flex: "none", borderRadius: "50%", background: open ? "#E11D24" : "#EDEDF0", display: "grid", placeItems: "center", transform: `rotate(${open ? 45 : 0}deg)`, transition: "transform .45s cubic-bezier(.22,1,.36,1), background .3s" }}>
                        <IconPlus size={14} stroke={open ? "#fff" : "#121212"} sw={3} />
                      </span>
                    </button>
                    {open && <div ref={faqRef} style={{ overflow: "hidden" }}><div style={{ padding: "0 24px 22px", fontSize: 16, lineHeight: 1.6, color: "#3A3A40" }}>{a}</div></div>}
                  </div>
                );
              })}
            </div>

            <div data-reveal="1" style={{ background: "#E11D24", color: "#fff", borderRadius: 32, padding: "56px 30px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <IconSparkle size={40} />
              <h3 style={{ margin: 0, fontSize: "clamp(30px, 5.6vw, 44px)", fontWeight: 700, letterSpacing: "-.04em" }}>Ready to cook smarter?</h3>
              <p style={{ margin: 0, fontSize: 19, maxWidth: 480, lineHeight: 1.5 }}>Upgrade today and unlock unlimited AI recipes, meal plans, nutrition tracking, and more.</p>
              <button onClick={onUpgrade} disabled={isPro || loading} style={{ marginTop: 10, height: 60, padding: "0 34px", border: 0, borderRadius: 999, background: "#fff", color: "#E11D24", fontSize: 18, fontWeight: 800, transition: "transform .3s cubic-bezier(.22,1,.36,1)" }}>{upgradeLabel}</button>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Cancel anytime · Secure checkout via Razorpay</div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
