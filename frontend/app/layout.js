import { Urbanist } from "next/font/google";
import "./globals.css";
import "./servd.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";
import KitchenProvider from "@/components/servd/KitchenProvider";
import AppShell from "@/components/servd/AppShell";

const urbanist = Urbanist({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export const metadata = {
  title: "Servd - AI Recipes Platform",
  description: "Snap your fridge, find what to cook, and cook it step by step.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1E1D1F",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#E11D24",
          colorText: "#121212",
          borderRadius: "18px",
          fontFamily: "Urbanist, system-ui, sans-serif",
        },
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <body className={`sv-body ${urbanist.className}`}>
          <KitchenProvider>
            <AppShell>{children}</AppShell>
          </KitchenProvider>
          <Toaster
            position="bottom-center"
            toastOptions={{
              style: {
                background: "#121212",
                color: "#fff",
                border: 0,
                borderRadius: 999,
                fontFamily: "inherit",
                fontWeight: 700,
              },
            }}
          />
          <footer style={{ padding: "18px 16px 110px", textAlign: "center", color: "#6A6A72", fontSize: 14, background: "#1E1D1F" }}>
            Made by Om mishra
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
