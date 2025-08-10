"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Crown, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { useUserPlan } from "@/hooks/use-user-plan"

// Strict test Payment Link fallback
const TEMP_PAYMENT_LINK = "https://buy.stripe.com/fZu3cvbKsgRv1KBgBheIw06"

export default function MembershipPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { isProUser, loading } = useUserPlan()
  const [selectedPlan, setSelectedPlan] = useState<"free" | "pro">(isProUser ? "pro" : "free")
  const [isRedirecting, setIsRedirecting] = useState(false)

  const handleUpgradeClick = async () => {
    try {
      setIsRedirecting(true)
      const idToken = await user?.getIdToken?.()

      // Server is hard-pinned to test price; this body is minimal by design
      const res = await fetch("/api/stripe/checkout/membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      })

      if (!res.ok) {
        window.open(TEMP_PAYMENT_LINK, "_blank")
        setIsRedirecting(false)
        return
      }

      const data = (await res.json()) as { url?: string }
      if (data?.url) {
        window.location.href = data.url
      } else {
        window.open(TEMP_PAYMENT_LINK, "_blank")
      }
    } catch (err) {
      console.error("[Membership] Error starting checkout:", err)
      window.open(TEMP_PAYMENT_LINK, "_blank")
    } finally {
      setIsRedirecting(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Membership Plans</h1>
        <p className="text-sm text-muted-foreground">
          Unlock premium features to accelerate your content creation workflow
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Free Plan */}
        <Card
          className={`group relative overflow-hidden border-2 transition-all duration-300 ${
            selectedPlan === "free" ? "border-red-600" : "border-zinc-800 hover:border-zinc-700"
          } bg-gradient-to-b from-zinc-900/80 to-black backdrop-blur-sm`}
        >
          {!isProUser && !loading && (
            <div className="absolute right-0 top-0 bg-red-600 px-3 py-1 text-xs font-bold text-white">CURRENT PLAN</div>
          )}
          <div className="p-8">
            <div className="mb-6 flex items-center">
              <Shield className="mr-3 h-7 w-7 text-zinc-400" />
              <h2 className="text-2xl font-medium text-white">Free</h2>
            </div>
            <p className="mb-6 text-zinc-400">Get started with basic features</p>
            <div className="mb-8 flex items-baseline">
              <p className="text-5xl font-bold text-white">$0</p>
              <span className="ml-2 text-lg text-zinc-400">/month</span>
            </div>

            <ul className="mb-8 space-y-5">
              <li className="flex items-start">
                <CheckCircle2 className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                <span className="text-white">
                  <strong>15 downloads</strong> per month
                </span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                <span className="text-white">
                  <strong>2 bundles max</strong> on storefront
                </span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-orange-400" />
                <span className="text-white">
                  <strong>10 videos per bundle</strong> limit
                </span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                <span className="text-white">Limited organization features</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-orange-400" />
                <span className="text-white">
                  <strong>20% platform fee</strong> on sales
                </span>
              </li>
            </ul>

            {isProUser ? (
              <Button
                onClick={() => router.push("/dashboard")}
                variant="outline"
                className="w-full border-zinc-700 bg-zinc-900/50 text-white hover:border-zinc-600 hover:bg-zinc-800/50"
              >
                Return to Dashboard
              </Button>
            ) : (
              <Button
                onClick={() => router.push("/dashboard")}
                variant="outline"
                className="w-full border-red-600 bg-black/30 text-white hover:bg-red-600/10"
              >
                Current Plan
              </Button>
            )}
          </div>
        </Card>

        {/* Creator Pro Plan */}
        <Card
          className={`group relative overflow-hidden border-2 transition-all duration-300 ${
            selectedPlan === "pro" ? "border-red-600" : "border-zinc-800 hover:border-zinc-700"
          } bg-gradient-to-b from-zinc-900/80 to-black backdrop-blur-sm`}
        >
          {!loading && (
            <div className="absolute right-0 top-0 bg-red-600 px-3 py-1 text-xs font-bold text-white">
              {isProUser ? "CURRENT PLAN" : "RECOMMENDED"}
            </div>
          )}
          <div className="p-8">
            <div className="mb-6 flex items-center">
              <Crown className="mr-3 h-7 w-7 text-yellow-500" />
              <h2 className="text-2xl font-medium text-white">Creator Pro</h2>
            </div>
            <p className="mb-6 text-zinc-400">Everything you need to create amazing content</p>
            <div className="mb-8 flex items-baseline">
              <p className="text-5xl font-bold text-white">$15</p>
              <span className="ml-2 text-lg text-zinc-400">/month</span>
            </div>

            <ul className="mb-8 space-y-5">
              <li className="flex items-start">
                <CheckCircle2 className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                <span className="text-white">
                  <strong>Unlimited downloads</strong>
                </span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                <span className="text-white">
                  <strong>Unlimited bundles</strong> on storefront
                </span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                <span className="text-white">
                  <strong>Unlimited videos per bundle</strong>
                </span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                <span className="text-white">Access to all clips</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                <span className="text-white">Priority support</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                <span className="text-white">
                  <strong>Only 10% platform fee</strong> on sales
                </span>
              </li>
            </ul>

            {isProUser ? (
              <Button
                onClick={() => router.push("/dashboard/user")}
                variant="outline"
                className="w-full border-red-600 bg-black/30 text-white hover:bg-red-600/10"
              >
                Manage Subscription
              </Button>
            ) : (
              <Button
                onClick={handleUpgradeClick}
                disabled={isRedirecting}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                {isRedirecting ? "Redirecting..." : "Upgrade to Creator Pro"}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
