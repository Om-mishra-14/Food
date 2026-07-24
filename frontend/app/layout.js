import { Inter  } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { ClerkProvider } from "@clerk/nextjs";
import { neobrutalism } from "@clerk/themes";
import { Toaster } from "@/components/ui/sonner";


const inter = Inter({subsets : ["latin"]})

export const metadata = {
  title: "Servd - AI Recioes Platform",
  description: "",
};

export default function RootLayout({ children }) {
  return (
  <ClerkProvider appearance={{theme : neobrutalism,}}>

    <html
      lang="en" suppressHydrationWarning>
      <body 
        classnamne={`${inter.className}`}>
         <Header />          <main className="min-h-screen">  
          {children}
          </main>
          <Toaster richColors/>
          <footer className="py-8 px-4 border-t">
            <div className="max-w-6xl mx-auto flex justify-center items-center ">
              <p className="text-stone-500 text-sm">Made by Om mishra</p>
            </div>
          </footer>
        </body>
  
    </html>
  </ClerkProvider>
  );
}
