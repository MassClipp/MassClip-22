"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, Crown, Shield, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { useUserPlan } from "@/hooks/use-user-plan"
import { BUNDLE_SLOT_TIERS } from "@/lib/bundle-slots-service"

export default function UpgradePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { isProUser, loading } = useUserPlan()
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [purchasingBundle, setPurchasingBundle] = useState<string | null>(null)

  useEffect(() => {
    const success = searchParams.get("success")
    const sessionId = searchParams.get("session_id")

    if (success === "true" && sessionId) {
      setShowSuccessMessage(true)
      const newUrl = window.location.pathname
      window.history.replaceState({}, "", newUrl)

      setTimeout(() => {
        setShowSuccessMessage(false)
      }, 5000)
    }
  }, [searchParams])

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

  const handleBundlePurchase = async (tier: keyof typeof BUNDLE_SLOT_TIERS) => {
    setPurchasingBundle(tier)
    try {
      const idToken = await user?.getIdToken?.()
      const tierInfo = BUNDLE_SLOT_TIERS[tier]

      const res = await fetch("/api/stripe/checkout/bundles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          bundleId: `bundle-slot-${tier}`,
          priceId: tierInfo.priceId,
          bundles: tierInfo.slots,
          price: tierInfo.amount / 100,
        }),
      })

      if (!res.ok) {
        console.warn("[Upgrade] Failed to create checkout session for bundle slots.")
        setPurchasingBundle(null)
        return
      }

      const data = (await res.json()) as { url?: string }
      if (data?.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error("[Upgrade] Error starting bundle slot checkout:", err)
      setPurchasingBundle(null)
    }
  }

  return (
    <div className="space-y-8">
      {showSuccessMessage && (
        <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            <div>
              <h3 className="text-green-300 font-medium">Purchase Successful!</h3>
              <p className="text-green-200/80 text-sm">
                Your purchase has been processed and your account has been updated.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="text-center space-y-3">
        <h1 className="text-4xl font-light text-white">
          Choose Your{" "}
          <span className="bg-gradient-to-br from-slate-300 via-cyan-200 to-white bg-clip-text text-transparent">
            Plan
          </span>
        </h1>
        <p className="text-lg text-white/70 max-w-2xl mx-auto">
          Unlock powerful features to organize and monetize your content
        </p>
      </div>

      <div className="space-y-6">
        <Card className="relative overflow-hidden border border-zinc-700/50 bg-gradient-to-br from-zinc-900/90 to-black/90">
          {!isProUser && !loading && (
            <div className="absolute right-0 top-0 bg-gradient-to-r from-slate-400 to-cyan-400 px-3 py-1 text-xs font-medium text-black">
              CURRENT PLAN
            </div>
          )}

          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                  <Shield className="h-6 w-6 text-zinc-300" />
                </div>
                <div>
                  <h2 className="text-2xl font-light text-white">Free</h2>
                  <p className="text-zinc-400">Perfect for getting started</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-4xl font-light text-white">$0</p>
                <span className="text-sm text-zinc-400">/month</span>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {[
                { text: "2 folders max (no subfolders)", highlight: false },
                { text: "2 bundles max on storefront", highlight: false },
                { text: "10 videos per bundle limit", highlight: false },
                { text: "Basic Vex AI - content organization only", highlight: false },
                { text: "20% platform fee on sales", highlight: false },
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <CheckCircle2 className={`h-4 w-4 ${feature.highlight ? "text-cyan-400" : "text-zinc-500"}`} />
                  <span className="text-white text-sm">{feature.text}</span>
                </div>
              ))}
            </div>

            <Button
              onClick={() => router.push("/dashboard")}
              variant="outline"
              className={`w-full ${
                isProUser
                  ? "border-zinc-600 bg-zinc-800/30 text-white"
                  : "border-cyan-400/50 bg-cyan-500/10 text-cyan-300"
              }`}
            >
              {isProUser ? "Return to Dashboard" : "Current Plan"}
            </Button>
          </div>
        </Card>

        <Card className="relative overflow-hidden border border-zinc-700/50 bg-gradient-to-br from-zinc-900/90 to-black/90">
          {!loading && (
            <div className="absolute right-0 top-0 bg-gradient-to-r from-cyan-400 to-blue-400 px-3 py-1 text-xs font-bold text-black">
              {isProUser ? "CURRENT PLAN" : "RECOMMENDED"}
            </div>
          )}

          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-400/30">
                  <Crown className="h-6 w-6 text-cyan-300" />
                </div>
                <div>
                  <h2 className="text-2xl font-light text-white">Creator Pro</h2>
                  <p className="text-zinc-400">Ready to take your monetization seriously?</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-4xl font-light text-white">$15</p>
                <span className="text-sm text-zinc-400">/month</span>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {[
                "Unlimited folders with subfolders",
                "Unlimited bundles on storefront",
                "Unlimited videos per bundle",
                "Full Vex AI - bundle creation & transcript analysis",
                "Only 10% platform fee on sales",
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                  <span className="text-white text-sm">{feature}</span>
                </div>
              ))}
            </div>

            {isProUser ? (
              <Button
                onClick={() => router.push("/dashboard/profile?tab=membership")}
                variant="outline"
                className="w-full border-cyan-400/50 bg-cyan-500/10 text-cyan-300"
              >
                Manage Subscription
              </Button>
            ) : (
              <Button
                onClick={handleUpgradeClick}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white"
              >
                Upgrade to Creator Pro
              </Button>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-light text-white mb-2">
              Need More{" "}
              <span className="bg-gradient-to-br from-slate-300 via-cyan-200 to-white bg-clip-text text-transparent">
                Bundle Slots?
              </span>
            </h2>
            <p className="text-zinc-400 text-sm">One-time purchases to expand your storefront capacity</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(
              Object.entries(BUNDLE_SLOT_TIERS) as [
                keyof typeof BUNDLE_SLOT_TIERS,
                (typeof BUNDLE_SLOT_TIERS)[keyof typeof BUNDLE_SLOT_TIERS],
              ][]
            ).map(([tier, info]) => (
              <Card key={tier} className="border border-zinc-700/50 bg-gradient-to-br from-zinc-900/90 to-black/90">
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30">
                      <Package className="h-5 w-5 text-purple-300" />
                    </div>
                    <div>
                      <h3 className="text-lg font-light text-white">{info.description}</h3>
                      <p className="text-xs text-zinc-500">One-time purchase</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-3xl font-light text-white">${(info.amount / 100).toFixed(2)}</p>
                    <p className="text-xs text-zinc-400 mt-1">
                      ${(info.amount / 100 / info.slots).toFixed(2)} per bundle slot
                    </p>
                  </div>

                  <Button
                    onClick={() => handleBundlePurchase(tier)}
                    disabled={purchasingBundle === tier}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white"
                  >
                    {purchasingBundle === tier ? "Processing..." : "Purchase"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <p className="text-center text-xs text-zinc-500">
            Bundle slots are added to your account permanently and never expire
          </p>
        </div>
      </div>
    </div>
  )
}
