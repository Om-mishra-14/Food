"use client";

import React, { useState, useEffect } from "react";
import { Check, X, ChevronDown, Sparkles, Zap, Star, ArrowRight } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

// ─── Pricing config ────────────────────────────────────────────────────────────
const PLANS = {
  monthly: { amount: 199, label: "₹199/mo", save: null },
  yearly: { amount: Math.round((199 * 12 * 0.8) / 12), label: "₹159/mo", save: "Save 20%" },
};

const COMPARISON = [
  { feature: "AI Recipes", free: "5/day", pro: "Unlimited" },
  { feature: "Pantry Tracker", free: true, pro: true },
  { feature: "Meal Planner", free: false, pro: true },
  { feature: "Nutrition Analysis", free: false, pro: true },
  { feature: "Export as PDF", free: false, pro: true },
  { feature: "Priority AI Model", free: false, pro: true },
  { feature: "Recipe History", free: "Last 7 days", pro: "Forever" },
];

const FAQ = [
  {
    q: "Can I cancel anytime?",
    a: "Yes! You can cancel your Pro subscription at any time. You'll continue to have Pro access until the end of your billing period.",
  },
  {
    q: "What payment methods are accepted?",
    a: "We accept all major credit/debit cards, UPI, net banking, and wallets through Razorpay's secure checkout.",
  },
  {
    q: "Is there a free trial for Pro?",
    a: "Currently we don't offer a free trial, but our Free plan lets you try AI recipes (5/day) before upgrading.",
  },
  {
    q: "What happens to my data if I downgrade?",
    a: "Your data is always safe. Pro features become unavailable but all your saved recipes and pantry items remain intact.",
  },
];

const TESTIMONIALS = [
  {
    name: "Priya Sharma",
    handle: "@priyacooks",
    avatar: "PS",
    text: "The AI recipe suggestions are mind-blowing. Took my ₹50 worth of veggies and made restaurant-level food! Pro is totally worth it.",
    stars: 5,
  },
  {
    name: "Rohan Mehta",
    handle: "@rohaneats",
    avatar: "RM",
    text: "The PDF export for meal plans + nutrition tracking has completely transformed how I cook for the week. Genuinely saves hours.",
    stars: 5,
  },
  {
    name: "Aisha Khan",
    handle: "@aishakitchen",
    avatar: "AK",
    text: "Upgraded to Pro last month and never looked back. The unlimited AI recipes feature alone is worth every rupee.",
    stars: 5,
  },
];

// ─── Sub-components ────────────────────────────────────────────────────────────
function BillingToggle({ billing, setBilling }) {
  return (
    <div className="flex items-center justify-center gap-4 mb-12">
      <span
        className={`text-sm font-semibold transition-colors ${
          billing === "monthly" ? "text-stone-900" : "text-stone-400"
        }`}
      >
        Monthly
      </span>

      {/* Animated toggle */}
      <button
        id="billing-toggle"
        onClick={() => setBilling(billing === "monthly" ? "yearly" : "monthly")}
        className={`relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
          billing === "yearly" ? "bg-orange-500" : "bg-stone-300"
        }`}
        aria-label="Toggle billing period"
      >
        <span
          className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${
            billing === "yearly" ? "translate-x-7" : "translate-x-0"
          }`}
        />
      </button>

      <span
        className={`text-sm font-semibold transition-colors ${
          billing === "yearly" ? "text-stone-900" : "text-stone-400"
        }`}
      >
        Yearly
      </span>

      {billing === "yearly" && (
        <span className="text-xs font-bold text-white bg-orange-500 px-2 py-0.5 rounded-full animate-pulse">
          Save 20%
        </span>
      )}
    </div>
  );
}

function PlanCard({ billing, subscriptionTier, onUpgrade, loading }) {
  const isPro = subscriptionTier === "pro";

  return (
    <div className="grid md:grid-cols-2 gap-6 mb-16">
      {/* Free Card */}
      <div className="relative rounded-2xl border-2 border-stone-200 bg-white/60 backdrop-blur-sm p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-stone-300">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-1">Free</p>
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-bold text-stone-900">₹0</span>
            <span className="text-stone-500 font-medium">/forever</span>
          </div>
          <p className="text-stone-600 mt-3 text-sm">Perfect to get started. No credit card needed.</p>
        </div>

        <ul className="space-y-3 mb-8">
          {["5 AI recipes per day", "Pantry tracker", "Recipe browsing", "Basic search"].map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-stone-700">
              <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
              {f}
            </li>
          ))}
          {["Meal planner", "Nutrition analysis", "PDF export", "Priority AI"].map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-stone-400 line-through">
              <X className="w-4 h-4 text-stone-300 flex-shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        {isPro ? (
          <div className="w-full py-3 text-center text-sm font-semibold text-stone-500 bg-stone-100 rounded-xl">
            Your previous plan
          </div>
        ) : (
          <div className="w-full py-3 text-center text-sm font-semibold text-stone-600 bg-stone-100 rounded-xl">
            Current plan
          </div>
        )}
      </div>

      {/* Pro Card */}
      <div
        className="relative rounded-2xl border-2 border-orange-500 bg-white/70 backdrop-blur-sm p-8 transition-all duration-300 hover:-translate-y-1 shadow-[0_0_40px_rgba(249,115,22,0.15)] hover:shadow-[0_0_60px_rgba(249,115,22,0.3)]"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(255,247,237,0.9) 100%)",
        }}
      >
        {/* Popular badge */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-orange-200">
            <Sparkles className="w-3 h-3" />
            Most Popular
          </span>
        </div>

        <div className="mb-6 mt-2">
          <p className="text-xs font-bold uppercase tracking-widest text-orange-600 mb-1">Pro Chef</p>
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-bold text-stone-900">
              {billing === "yearly" ? "₹159" : "₹199"}
            </span>
            <span className="text-stone-500 font-medium">/mo</span>
          </div>
          {billing === "yearly" && (
            <p className="text-xs text-orange-600 font-semibold mt-1">
              Billed ₹1,908/year · saves ₹492
            </p>
          )}
          <p className="text-stone-600 mt-3 text-sm">Everything to master your kitchen.</p>
        </div>

        <ul className="space-y-3 mb-8">
          {[
            "Unlimited AI recipes",
            "Pantry tracker",
            "Full meal planner",
            "Nutrition analysis",
            "PDF export",
            "Priority AI model",
            "Lifetime recipe history",
          ].map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-stone-800 font-medium">
              <Check className="w-4 h-4 text-orange-500 flex-shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        {isPro ? (
          <div className="w-full py-3 text-center text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl shadow-md">
            ✨ You're on Pro!
          </div>
        ) : (
          <button
            id="upgrade-to-pro-btn"
            onClick={() => onUpgrade(billing)}
            disabled={loading}
            className="w-full py-3 flex items-center justify-center gap-2 text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl shadow-md shadow-orange-200 hover:shadow-orange-300 hover:brightness-110 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing…
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Upgrade to Pro
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function ComparisonTable() {
  const renderCell = (val) => {
    if (val === true) return <Check className="w-5 h-5 text-green-600 mx-auto" />;
    if (val === false) return <X className="w-5 h-5 text-stone-300 mx-auto" />;
    return <span className="text-sm font-medium text-stone-700">{val}</span>;
  };

  return (
    <div className="mb-16">
      <h3 className="text-2xl font-bold text-stone-900 mb-6 text-center">Full Comparison</h3>
      <div className="rounded-2xl border-2 border-stone-200 overflow-hidden bg-white">
        <table className="w-full">
          <thead>
            <tr className="bg-stone-50 border-b-2 border-stone-200">
              <th className="text-left py-4 px-6 text-sm font-bold text-stone-700 w-1/2">Feature</th>
              <th className="py-4 px-6 text-sm font-bold text-stone-500 text-center w-1/4">Free</th>
              <th className="py-4 px-6 text-sm font-bold text-orange-600 text-center w-1/4">Pro ✨</th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON.map((row, i) => (
              <tr key={row.feature} className={i % 2 === 0 ? "bg-white" : "bg-stone-50/50"}>
                <td className="py-4 px-6 text-sm font-semibold text-stone-800">{row.feature}</td>
                <td className="py-4 px-6 text-center">{renderCell(row.free)}</td>
                <td className="py-4 px-6 text-center">{renderCell(row.pro)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <div className="mb-16">
      <h3 className="text-2xl font-bold text-stone-900 mb-6 text-center">FAQ</h3>
      <div className="space-y-3 max-w-2xl mx-auto">
        {FAQ.map((item, i) => (
          <div
            key={i}
            className="rounded-xl border-2 border-stone-200 bg-white overflow-hidden transition-all duration-200"
          >
            <button
              id={`faq-item-${i}`}
              className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-stone-50 transition-colors"
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
            >
              <span className="text-sm font-semibold text-stone-900">{item.q}</span>
              <ChevronDown
                className={`w-4 h-4 text-stone-500 flex-shrink-0 ml-4 transition-transform duration-200 ${
                  openIndex === i ? "rotate-180" : ""
                }`}
              />
            </button>
            {openIndex === i && (
              <div className="px-6 pb-4 text-sm text-stone-600 leading-relaxed animate-in slide-in-from-top-1 duration-200">
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Testimonials() {
  return (
    <div className="mb-16">
      <h3 className="text-2xl font-bold text-stone-900 mb-6 text-center">
        Loved by home chefs 🧑‍🍳
      </h3>
      <div className="grid md:grid-cols-3 gap-5">
        {TESTIMONIALS.map((t) => (
          <div
            key={t.handle}
            className="rounded-2xl border-2 border-stone-200 bg-white/70 backdrop-blur-sm p-6 hover:-translate-y-1 hover:shadow-lg hover:border-orange-200 transition-all duration-300"
          >
            <div className="flex gap-0.5 mb-3">
              {[...Array(t.stars)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-orange-500 text-orange-500" />
              ))}
            </div>
            <p className="text-sm text-stone-700 leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-xs font-bold">
                {t.avatar}
              </div>
              <div>
                <p className="text-xs font-bold text-stone-900">{t.name}</p>
                <p className="text-xs text-stone-500">{t.handle}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CTABanner({ onUpgrade, loading, billing }) {
  return (
    <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 p-10 text-center text-white shadow-2xl shadow-orange-200">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-48 h-48 bg-white/10 rounded-full -translate-x-16 -translate-y-16 blur-2xl" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-20 translate-y-20 blur-2xl" />

      <div className="relative">
        <Sparkles className="w-10 h-10 mx-auto mb-4 opacity-90" />
        <h3 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">
          Ready to cook smarter?
        </h3>
        <p className="text-white/80 mb-8 text-lg font-light max-w-md mx-auto">
          Upgrade today and unlock unlimited AI recipes, meal plans, nutrition tracking, and more.
        </p>
        <button
          id="cta-upgrade-btn"
          onClick={() => onUpgrade(billing)}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-white text-orange-600 font-bold px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl hover:bg-orange-50 transition-all duration-200 text-base disabled:opacity-60"
        >
          {loading ? "Processing…" : (
            <>
              <Zap className="w-5 h-5" />
              Upgrade to Pro
            </>
          )}
        </button>
        <p className="text-white/60 mt-4 text-sm">Cancel anytime · Secure checkout via Razorpay</p>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function PricingSection({ subscriptionTier = "free" }) {
  const [billing, setBilling] = useState("monthly");
  const [loading, setLoading] = useState(false);
  const { user } = useUser();

  // Load Razorpay checkout script dynamically
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (typeof window !== "undefined" && window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleUpgrade = async (billingCycle) => {
    if (!user) {
      toast.error("Please sign in to upgrade.");
      return;
    }

    setLoading(true);

    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        throw new Error("Failed to load Razorpay SDK. Please check your internet connection.");
      }

      const amount = billingCycle === "yearly" ? 199 * 12 * 0.8 : 199; // total amount

      // 1. Create order on Strapi backend
      const strapiUrl =
        process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";

      const orderRes = await fetch(`${strapiUrl}/api/payment/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(amount),
          userId: user.id,
          billingCycle,
        }),
      });

      if (!orderRes.ok) {
        const err = await orderRes.text();
        throw new Error(err || "Failed to create order");
      }

      const { orderId, amount: orderAmount, currency, keyId } = await orderRes.json();

      // 2. Open Razorpay checkout
      const options = {
        key: keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderAmount,
        currency,
        name: "Servd · Pro Chef",
        description: `Pro Plan · ${billingCycle === "yearly" ? "Yearly" : "Monthly"}`,
        order_id: orderId,
        prefill: {
          name: user.fullName || "",
          email: user.primaryEmailAddress?.emailAddress || "",
        },
        theme: { color: "#f97316" },
        handler: async (response) => {
          try {
            // 3. Verify payment on Strapi backend
            const verifyRes = await fetch(`${strapiUrl}/api/payment/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                clerkId: user.id,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.success) {
              toast.success("🎉 Welcome to Pro! Refreshing your account…");
              setTimeout(() => {
                window.location.reload();
              }, 1500);
            } else {
              toast.error("Payment verified but upgrade failed. Contact support.");
            }
          } catch (err) {
            toast.error("Verification failed: " + err.message);
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            toast.info("Payment cancelled.");
            setLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response) => {
        toast.error(`Payment failed: ${response.error?.description || "Transaction failed"}`);
        setLoading(false);
      });
      rzp.open();
    } catch (error) {
      console.error("Upgrade error:", error);
      toast.error(error.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-12">
        <h2 className="text-5xl md:text-6xl font-bold text-stone-900 mb-4 tracking-tight">
          Simple Pricing
        </h2>
        <p className="text-xl text-stone-500 font-light">
          Start free. Upgrade when you&apos;re ready to cook like a pro.
        </p>
      </div>

      {/* Billing Toggle */}
      <BillingToggle billing={billing} setBilling={setBilling} />

      {/* Plan Cards */}
      <PlanCard
        billing={billing}
        subscriptionTier={subscriptionTier}
        onUpgrade={handleUpgrade}
        loading={loading}
      />

      {/* Comparison Table */}
      <ComparisonTable />

      {/* Testimonials */}
      <Testimonials />

      {/* FAQ */}
      <FAQSection />

      {/* CTA Banner */}
      {subscriptionTier !== "pro" && (
        <CTABanner onUpgrade={handleUpgrade} loading={loading} billing={billing} />
      )}
    </div>
  );
}
