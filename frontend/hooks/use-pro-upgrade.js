"use client";
// Razorpay checkout for Pro, moved from the old PricingSection component.
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

// Always use production backend for payments - env vars may not be available on Vercel
const PAYMENTS_URL = "https://food-backend-e25g.onrender.com";

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function useProUpgrade({ onUpgraded } = {}) {
  const [loading, setLoading] = useState(false);
  const { user } = useUser();

  const upgrade = async (billingCycle = "monthly") => {
    if (!user) {
      toast.error("Please sign in to upgrade.");
      return;
    }
    setLoading(true);
    try {
      if (!(await loadRazorpayScript())) {
        throw new Error("Failed to load Razorpay SDK. Please check your internet connection.");
      }
      const amount = billingCycle === "yearly" ? 199 * 12 * 0.8 : 199;

      const orderRes = await fetch(`${PAYMENTS_URL}/api/payment/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Math.round(amount), userId: user.id, billingCycle }),
      });
      if (!orderRes.ok) {
        const errText = await orderRes.text();
        let errMsg = "Failed to create payment order";
        try {
          const errJson = JSON.parse(errText);
          errMsg = errJson.error?.message || errJson.message || errMsg;
        } catch {
          errMsg =
            errText.includes("<!DOCTYPE") || errText.includes("<html")
              ? "Backend server is waking up or unavailable. Please try again in 10 seconds."
              : errText;
        }
        throw new Error(errMsg);
      }
      const { orderId, amount: orderAmount, currency, keyId } = await orderRes.json();

      const rzp = new window.Razorpay({
        key: keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderAmount,
        currency,
        name: "Fridge2Fork · Pro Chef",
        description: `Pro Plan · ${billingCycle === "yearly" ? "Yearly" : "Monthly"}`,
        order_id: orderId,
        prefill: { name: user.fullName || "", email: user.primaryEmailAddress?.emailAddress || "" },
        theme: { color: "#E11D24" },
        handler: async (response) => {
          try {
            const verifyRes = await fetch(`${PAYMENTS_URL}/api/payment/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                clerkId: user.id,
              }),
            });
            let verifyData = {};
            try {
              verifyData = JSON.parse(await verifyRes.text());
            } catch {
              throw new Error("Invalid verification response from server");
            }
            if (verifyRes.ok && verifyData.success) {
              toast.success("Welcome to Pro!");
              onUpgraded?.();
            } else {
              toast.error(verifyData.error?.message || verifyData.message || "Payment verified but upgrade failed. Contact support.");
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
      });
      rzp.on("payment.failed", (response) => {
        toast.error(`Payment failed: ${response.error?.description || "Transaction failed"}`);
        setLoading(false);
      });
      rzp.open();
    } catch (error) {
      toast.error(error.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return { upgrade, loading };
}
