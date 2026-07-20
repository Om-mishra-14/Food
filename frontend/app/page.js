import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { auth } from "@clerk/nextjs/server";
import { Flame } from "lucide-react";



export default async function Home() {
  const {has} = await auth();
  const subscriptionTier = has({ plan: "pro"}) ? "pro" : "free";
  return (
   <div className="min-h-screen bg-stone-50 text-stone-900">
    <section className="pt-32 pb-20 px-4">
      <div>
        <div>
          <div>
            <Badge variant="outline" className="border-2 border-orange-600 text-orange-700 bg-orange-50 text-sm font-bold mb-6 uppercase tracking-wide"
              >
              <Flame className="mr-1"></Flame>
              #1 AI Cooking Assitant 
            </Badge>
            
            <h1 className="text-6xl md:text-8xl font-bold mb-6 leading-[0.9] tracking-tight">
            Turn your{" "}
                <span className="italic underline decoration-4 decoration-orange-600">
                  leftovers
                </span>{" "}
                into <br />
                masterpieces.
              </h1>



              <p className="text-xl md:text-2xl text-stone-600 mb-10 max-w-lg mx-auto md:mx-0 font-light">
                Snap a photo of your fridge. We&apos;ll tell you what to cook.
                Save money, reduce waste, and eat better tonight.
              </p>

                 <Link href="/dashboard">
                <Button
                  size="xl"
                  variant="primary"
                  className="px-8 py-6 text-lg"
                >
                  Start Cooking Free <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
          </div>
        </div>
      </div>
    </section>
   </div>
  );
}
