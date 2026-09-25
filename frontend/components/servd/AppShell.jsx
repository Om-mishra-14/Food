"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { useKitchen } from "./KitchenProvider";
import { IconBookmark, IconBox, IconCalendar, IconCheck, IconChef, IconCompass, IconGlobe, IconHome, IconSparkle } from "./icons";
import { anim, EASE, motionOff, UP } from "@/lib/servd/motion";

const TABS = [
  { k: "home", href: "/", long: "Home", short: "Home", Icon: IconHome },
  { k: "discover", href: "/dashboard", long: "Dashboard", short: "Discover", Icon: IconCompass },
  { k: "explore", href: "/explore", long: "Explore", short: "Explore", Icon: IconGlobe },
  { k: "saved", href: "/recipes", long: "My Recipes", short: "Saved", Icon: IconBookmark },
  { k: "plan", href: "/planner", long: "Planner", short: "Planner", Icon: IconCalendar },
  { k: "pantry", href: "/pantry", long: "My Pantry", short: "Pantry", Icon: IconBox },
  { k: "cook", href: "/recipe", long: "How to Cook", short: "Cook", Icon: IconChef },
];

export function screenOf(pathname) {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/dashboard")) return "discover";
  if (pathname.startsWith("/explore")) return "explore";
  if (pathname.startsWith("/recipes")) return "saved";
  if (pathname.startsWith("/planner")) return "plan";
  if (pathname.startsWith("/pantry")) return "pantry";
  if (pathname.startsWith("/recipe")) return "cook";
  return "";
}

export function scrollToPricing() {
  const el = document.getElementById("pricing");
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 24, behavior: "smooth" });
}

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const screen = screenOf(pathname);
  const { isPro, toast } = useKitchen();
  const navRef = useRef(null);
  const toastRef = useRef(null);
  const [ind, setInd] = useState(null);
  const [ready, setReady] = useState(false);

  const measure = useCallback(() => {
    const a = navRef.current?.querySelector('[data-active="1"]');
    if (!a || a.offsetWidth === 0) return setInd(null);
    const v = { left: a.offsetLeft, top: a.offsetTop, w: a.offsetWidth, h: a.offsetHeight };
    setInd((o) => (o && Math.abs(o.left - v.left) < 0.5 && Math.abs(o.top - v.top) < 0.5 && Math.abs(o.w - v.w) < 0.5 && Math.abs(o.h - v.h) < 0.5 ? o : v));
  }, []);

  useLayoutEffect(measure, [screen, measure]);
  useEffect(() => {
    window.addEventListener("resize", measure);
    document.fonts?.ready?.then(measure);
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
    return () => { window.removeEventListener("resize", measure); cancelAnimationFrame(id); };
  }, [measure]);

  useEffect(() => {
    if (toast) anim(toastRef.current, [{ opacity: 0, transform: "translate(-50%, 20px) scale(.9)" }, { opacity: 1, transform: "translateX(-50%)" }], { duration: 450, easing: "cubic-bezier(.34,1.56,.64,1)" });
  }, [toast]);

  const goPricing = (e) => {
    e.preventDefault();
    if (pathname === "/") scrollToPricing();
    else router.push("/#pricing");
  };

  const t = ready && !motionOff() ? `left .6s ${EASE}, top .6s ${EASE}, width .6s ${EASE}, height .6s ${EASE}` : "none";

  return (
    <div className="sv-root">
      <div className="sv-shell">
        <header className="sv-header">
          <Link href="/" className="sv-logo" aria-label="Servd home">SERVD</Link>
          <nav ref={navRef} className="sv-nav" aria-label="Main">
            <div className="sv-nav-ind" style={{ left: ind?.left || 0, top: ind?.top || 0, width: ind?.w || 0, height: ind?.h || 0, opacity: ind ? 1 : 0, transition: t }} />
            {TABS.map(({ k, href, long, short, Icon }) => (
              <Link key={k} href={href} data-tab={k} data-active={screen === k ? "1" : "0"} className="sv-tab" aria-current={screen === k ? "page" : undefined}>
                <Icon size={20} />
                <span className="sv-tab-long">{long}</span>
                <span className="sv-tab-short">{short}</span>
              </Link>
            ))}
          </nav>
          <div className="sv-header-right">
            <Link href="/#pricing" onClick={goPricing} className="sv-pro-btn">
              <IconSparkle size={18} />
              {isPro ? "Pro Chef" : "Free Plan"}
            </Link>
            <SignedIn>
              <UserButton appearance={{ elements: { avatarBox: { width: 44, height: 44 } } }} />
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="sv-signin">Sign in</button>
              </SignInButton>
            </SignedOut>
          </div>
        </header>
        <ScreenFade screen={screen}>{children}</ScreenFade>
      </div>
      {toast && (
        <div ref={toastRef} className="sv-toast" role="status">
          <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#E11D24", display: "grid", placeItems: "center" }}>
            <IconCheck size={11} sw={3.4} />
          </span>
          {toast}
        </div>
      )}
    </div>
  );
}

// Each screen change fades the page up and scrolls to the top.
function ScreenFade({ screen, children }) {
  const ref = useRef(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!window.location.hash) window.scrollTo({ top: 0, behavior: "smooth" });
    anim(ref.current?.querySelector("[data-screen]"), UP(18), { duration: 650 });
  }, [screen]);
  return <div ref={ref} style={{ display: "contents" }}>{children}</div>;
}
