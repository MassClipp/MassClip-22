"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Crown, Shield, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { useUserPlan } from "@/hooks/use-user-plan"

const bundleOptions = [
  {
    id: "bundle-1",
    name: "1 Extra Bundle",
    price: 3.99,
    bundles: 1,
    description: "Perfect for trying out premium bundles",
    icon: Package,
    priceId: "price_1S4pU2Dheyb0pkWFfJNzelxi",
  },
  {
    id: "bundle-3",
    name: "3 Extra Bundles",
    price: 7.99,
    bundles: 3,
    description: "Great value for regular creators",
    icon: Package,
    popular: true,
    priceId: "price_1S4pUrDheyb0pkWFAY0jv6Xy",
  },
  {
    id: "bundle-5",
    name: "5 Extra Bundles",
    price: 11.99,
    bundles: 5,
    description: "Best deal for power users",
    icon: Package,
    priceId: "price_1S4pVUDheyb0pkWF4AT6vKMQ",
  },
]

export default function UpgradePage() {
  const router = useRouter()
  const { user } = useAuth()
  const { isProUser, loading } = useUserPlan()
  const [purchasingBundle, setPurchasingBundle] = useState<string | null>(null)

  const handleBundlePurchase = async (bundleId: string) => {
    try {
      setPurchasingBundle(bundleId)
      const bundleOption = bundleOptions.find((option) => option.id === bundleId)
      if (!bundleOption) {
        console.warn("[Upgrade] Bundle option not found")
        return
      }

      const idToken = await user?.getIdToken?.()
      const res = await fetch("/api/stripe/checkout/bundles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          bundleId,
          priceId: bundleOption.priceId,
          bundles: bundleOption.bundles,
          price: bundleOption.price,
        }),
      })

      if (!res.ok) {
        console.warn("[Upgrade] Failed to create checkout session for bundle purchase.")
        return
      }

      const data = (await res.json()) as { url?: string }
      if (data?.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error("[Upgrade] Error starting bundle checkout:", err)
    } finally {
      setPurchasingBundle(null)
    }
  }

  const handleUpgradeClick = async () => {
    try {
      const idToken = await user?.getIdToken?.()
      const res = await fetch("/api/stripe/checkout/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      })

      if (!res.ok) {
        console.warn("[Upgrade] Failed to create checkout session for membership.")
        return
      }

      const data = (await res.json()) as { url?: string }
      if (data?.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error("[Upgrade] Error starting membership checkout:", err)
    }
  }

  return (
    <div className="space-y-12 p-8">
      <div className="text-center space-y-4">
        <h1 className="text-5xl lg:text-6xl font-thin text-white leading-tight">
          Choose Your{" "}
          <span className="bg-gradient-to-br from-slate-300 via-cyan-200 via-blue-100 to-white bg-clip-text text-transparent">
            Upgrade
          </span>{" "}
          Plan
        </h1>
        <p className="text-xl text-white/70 font-light max-w-2xl mx-auto">
          Get extra bundles with one-time purchases or upgrade to Creator Pro for unlimited access
        </p>
      </div>

      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-light text-white mb-4">One-Time Bundle Purchases</h2>
          <p className="text-white/60 font-light">
            Perfect for free users who want extra bundles without a subscription
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {bundleOptions.map((option) => {
            const Icon = option.icon
            const isPurchasing = purchasingBundle === option.id

            return (
              <Card
                key={option.id}
                className={`group relative overflow-hidden border-2 transition-all duration-500 ${
                  option.popular
                    ? "border-cyan-400/50 shadow-2xl shadow-cyan-500/20 scale-105"
                    : "border-zinc-700/50 hover:border-zinc-600/70"
                } bg-gradient-to-br from-zinc-900/90 via-zinc-800/80 to-black/90 backdrop-blur-xl`}
              >
                {option.popular && (
                  <div className="absolute right-0 top-0 bg-gradient-to-r from-cyan-400 to-blue-400 px-4 py-2 text-sm font-bold text-black">
                    POPULAR
                  </div>
                )}

                <div className="p-8">
                  <div className="mb-6 flex items-center">
                    <div className="mr-4 p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-400/30">
                      <Icon className="h-6 w-6 text-cyan-300" />
                    </div>
                    <div>
                      <h3 className="text-xl font-light text-white">{option.name}</h3>
                      <p className="text-zinc-400 text-sm font-light">{option.description}</p>
                    </div>
                  </div>

                  <div className="mb-6 flex items-baseline">
                    <p className="text-4xl font-thin text-white">${option.price}</p>
                    <span className="ml-2 text-sm text-zinc-400 font-light">one-time</span>
                  </div>

                  <ul className="mb-8 space-y-3">
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-3 mt-1 h-4 w-4 flex-shrink-0 text-cyan-400" />
                      <span className="text-white font-light">
                        {option.bundles} extra bundle{option.bundles > 1 ? "s" : ""}
                      </span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-3 mt-1 h-4 w-4 flex-shrink-0 text-cyan-400" />
                      <span className="text-white font-light">Can purchase multiple times</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-3 mt-1 h-4 w-4 flex-shrink-0 text-cyan-400" />
                      <span className="text-white font-light">Instant activation</span>
                    </li>
                  </ul>

                  <Button
                    onClick={() => handleBundlePurchase(option.id)}
                    disabled={isPurchasing}
                    className="w-full py-3 text-sm font-medium rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white transition-all duration-300 shadow-lg shadow-cyan-500/25"
                  >
                    {isPurchasing ? (
                      <div className="flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Processing...
                      </div>
                    ) : (
                      `Purchase ${option.bundles} Bundle${option.bundles > 1 ? "s" : ""}`
                    )}
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      <div className="text-center">
        <div className="inline-block p-1 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-2xl">
          <div className="bg-zinc-900 rounded-xl p-8">
            <h3 className="text-2xl font-light text-white mb-4">Or Go Unlimited</h3>
            <p className="text-white/60 mb-6">Get unlimited bundles and premium features with Creator Pro</p>
          </div>
        </div>
      </div>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-2">
        {/* Free Plan */}
        <Card className="group relative overflow-hidden border-2 border-zinc-700/50 hover:border-zinc-600/70 bg-gradient-to-br from-zinc-900/90 via-zinc-800/80 to-black/90 backdrop-blur-xl transition-all duration-500">
          {!isProUser && !loading && (
            <div className="absolute right-0 top-0 bg-gradient-to-r from-slate-400 to-cyan-400 px-4 py-2 text-sm font-medium text-black">
              CURRENT PLAN
            </div>
          )}

          <div className="p-10">
            <div className="mb-8 flex items-center">
              <div className="mr-4 p-3 rounded-2xl bg-zinc-800/50 border border-zinc-700/50">
                <Shield className="h-8 w-8 text-zinc-300" />
              </div>
              <div>
                <h2 className="text-3xl font-light text-white">Free</h2>
                <p className="text-zinc-400 font-light">Perfect for getting started</p>
              </div>
            </div>

            <div className="mb-8 flex items-baseline">
              <p className="text-6xl font-thin text-white">$0</p>
              <span className="ml-3 text-xl text-zinc-400 font-light">/month</span>
            </div>

            <ul className="mb-10 space-y-4">
              {[
                { text: "15 downloads per month", highlight: true },
                { text: "2 bundles max on storefront", highlight: false },
                { text: "10 videos per bundle limit", highlight: false },
                { text: "Limited organization features", highlight: false },
                { text: "20% platform fee on sales", highlight: false },
              ].map((feature, index) => (
                <li key={index} className="flex items-start">
                  <CheckCircle2
                    className={`mr-4 mt-1 h-5 w-5 flex-shrink-0 ${
                      feature.highlight ? "text-cyan-400" : "text-zinc-500"
                    }`}
                  />
                  <span className="text-white font-light">{feature.text}</span>
                </li>
              ))}
            </ul>

            <Button
              onClick={() => router.push("/dashboard")}
              variant="outline"
              className={`w-full py-4 text-lg font-light rounded-xl transition-all duration-300 ${
                isProUser
                  ? "border-zinc-600 bg-zinc-800/30 text-white hover:bg-zinc-700/50"
                  : "border-cyan-400/50 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20"
              }`}
            >
              {isProUser ? "Return to Dashboard" : "Current Plan"}
            </Button>
          </div>
        </Card>

        {/* Creator Pro Plan */}
        <Card className="group relative overflow-hidden border-2 border-zinc-700/50 hover:border-zinc-600/70 bg-gradient-to-br from-zinc-900/90 via-zinc-800/80 to-black/90 backdrop-blur-xl transition-all duration-500">
          {!loading && (
            <div className="absolute -right-1 -top-1 bg-gradient-to-r from-cyan-400 to-blue-400 px-3 py-1.5 text-xs font-bold text-black rounded-bl-lg z-10">
              {isProUser ? "CURRENT PLAN" : "RECOMMENDED"}
            </div>
          )}

          <div className="p-6 sm:p-10">
            <div className="mb-8 flex items-center">
              <div className="mr-4 p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-400/30">
                <Crown className="h-8 w-8 text-cyan-300" />
              </div>
              <div>
                <h2 className="text-3xl font-light text-white">Creator Pro</h2>
                <p className="text-zinc-400 font-light">Ready to take your monetization seriously?</p>
              </div>
            </div>

            <div className="mb-8 flex items-baseline">
              <p className="text-6xl font-thin text-white">$15</p>
              <span className="ml-3 text-xl text-zinc-400 font-light">/month</span>
            </div>

            <ul className="mb-10 space-y-5 sm:space-y-4 px-2 sm:px-0">
              {[
                "Unlimited downloads",
                "Unlimited bundles on storefront",
                "Unlimited videos per bundle",
                "Access to all clips",
                "Priority support",
                "Only 10% platform fee on sales",
              ].map((feature, index) => (
                <li key={index} className="flex items-start py-1">
                  <CheckCircle2 className="mr-4 mt-1 h-5 w-5 flex-shrink-0 text-cyan-400" />
                  <span className="text-white font-light text-base sm:text-sm leading-relaxed">{feature}</span>
                </li>
              ))}
            </ul>

            {isProUser ? (
              <Button
                onClick={() => router.push("/dashboard/profile?tab=membership")}
                variant="outline"
                className="w-full py-4 text-lg font-light rounded-xl border-cyan-400/50 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 transition-all duration-300"
              >
                Manage Subscription
              </Button>
            ) : (
              <Button
                onClick={handleUpgradeClick}
                className="w-full py-4 text-lg font-medium rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white transition-all duration-300 shadow-lg shadow-cyan-500/25"
              >
                Upgrade to Creator Pro
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
