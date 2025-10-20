"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { isProUser, loading } = useUserPlan()
  const [purchasingBundle, setPurchasingBundle] = useState<string | null>(null)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    hasActiveSubscription: boolean
    isOnTrial: boolean
    currentPlan: "starter" | "creator_vip" | null
    hasUsedFirstWeekDiscount: boolean
  } | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)

  useEffect(() => {
    const success = searchParams.get("success")
    const sessionId = searchParams.get("session_id")

    if (success === "true" && sessionId) {
      setShowSuccessMessage(true)

      if (typeof window !== "undefined" && (window as any).fbq) {
        const bundleType = searchParams.get("bundle_type") || "bundle_capacity"
        const bundleCount = searchParams.get("bundle_count") || "1"
        const amount = searchParams.get("amount") || "3.99"
        ;(window as any).fbq("track", "Purchase", {
          value: Number.parseFloat(amount),
          currency: "USD",
          content_name: `${bundleCount} Extra Bundle${Number.parseInt(bundleCount) > 1 ? "s" : ""}`,
          content_type: "bundle_capacity",
          content_ids: [bundleType],
          num_items: Number.parseInt(bundleCount),
        })
      }

      const newUrl = window.location.pathname
      window.history.replaceState({}, "", newUrl)

      setTimeout(() => {
        setShowSuccessMessage(false)
      }, 5000)
    }
  }, [searchParams])

  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      if (!user) {
        setStatusLoading(false)
        return
      }

      try {
        const idToken = await user.getIdToken()

        const trialRes = await fetch("/api/user/trial-status", {
          headers: { Authorization: `Bearer ${idToken}` },
        })
        const trialData = await trialRes.json()

        const membershipRes = await fetch("/api/membership-status", {
          headers: { Authorization: `Bearer ${idToken}` },
        })
        const membershipData = await membershipRes.json()

        const limitsRes = await fetch("/api/user/free-limits", {
          headers: { Authorization: `Bearer ${idToken}` },
        })
        const limitsData = await limitsRes.json()

        console.log("[v0] Subscription status:", {
          trial: trialData,
          membership: membershipData,
          limits: limitsData,
        })

        const hasActiveSubscription = membershipData.isActive && membershipData.status === "active"
        const isOnTrial = trialData.isOnTrial || membershipData.status === "trialing"

        let currentPlan: "starter" | "creator_vip" | null = null
        if (hasActiveSubscription || isOnTrial) {
          currentPlan =
            membershipData.plan === "creator_pro" || membershipData.plan === "creator_vip" ? "creator_vip" : "starter"
        }

        setSubscriptionStatus({
          hasActiveSubscription,
          isOnTrial,
          currentPlan,
          hasUsedFirstWeekDiscount: limitsData.hasUsedFirstWeekDiscount || false,
        })
      } catch (error) {
        console.error("[v0] Error fetching subscription status:", error)
      } finally {
        setStatusLoading(false)
      }
    }

    fetchSubscriptionStatus()
  }, [user])

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

  const handleUpgradeClick = async (plan: "starter" | "creator_vip") => {
    try {
      const idToken = await user?.getIdToken?.()
      const res = await fetch("/api/stripe/checkout/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          plan,
        }),
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

  const isPayingOrOnTrial = subscriptionStatus?.hasActiveSubscription || subscriptionStatus?.isOnTrial
  const showFirstWeekPromo = !subscriptionStatus?.hasUsedFirstWeekDiscount

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
        <p className="text-lg text-white/70 max-w-2xl mx-auto">Select the plan that fits your content creation needs</p>
      </div>

      <div className="space-y-6">
        {/* Starter Plan */}
        <Card className="relative overflow-hidden border border-zinc-700/50 bg-gradient-to-br from-zinc-900/90 to-black/90">
          {!statusLoading && subscriptionStatus?.currentPlan === "starter" && (
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
                  <h2 className="text-2xl font-light text-white">Starter Plan</h2>
                  <p className="text-zinc-400">For new creators testing the waters</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-4xl font-light text-white">$3</p>
                <span className="text-sm text-zinc-400">/month</span>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {[
                { text: "3 folders with subfolders", highlight: true },
                { text: "5 bundles max on storefront", highlight: false },
                { text: "15 videos per bundle limit", highlight: false },
                { text: "Basic Vex AI - file metadata & folder organization", highlight: false },
                { text: "20% platform fee on sales", highlight: false },
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <CheckCircle2 className={`h-4 w-4 ${feature.highlight ? "text-cyan-400" : "text-zinc-500"}`} />
                  <span className="text-white text-sm">{feature.text}</span>
                </div>
              ))}
            </div>

            {subscriptionStatus?.currentPlan === "starter" ? (
              <Button
                onClick={() => router.push("/dashboard/profile?tab=membership")}
                variant="outline"
                className="w-full border-cyan-400/50 bg-cyan-500/10 text-cyan-300"
              >
                Manage Subscription
              </Button>
            ) : (
              <Button
                onClick={() => handleUpgradeClick("starter")}
                className="w-full bg-gradient-to-r from-slate-500 to-cyan-500 hover:from-slate-400 hover:to-cyan-400 text-white"
              >
                Get Started
              </Button>
            )}
          </div>
        </Card>

        {/* Creator VIP Plan */}
        <Card className="relative overflow-hidden border border-zinc-700/50 bg-gradient-to-br from-zinc-900/90 to-black/90">
          {!statusLoading && (
            <div className="absolute right-0 top-0 bg-gradient-to-r from-cyan-400 to-blue-400 px-3 py-1 text-xs font-bold text-black">
              {subscriptionStatus?.currentPlan === "creator_vip" ? "CURRENT PLAN" : "RECOMMENDED"}
            </div>
          )}

          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-400/30">
                  <Crown className="h-6 w-6 text-cyan-300" />
                </div>
                <div>
                  <h2 className="text-2xl font-light text-white">Creator VIP</h2>
                  <p className="text-zinc-400">For creators who treat content like a business</p>
                </div>
              </div>
              <div className="text-right">
                {showFirstWeekPromo ? (
                  <>
                    <p className="text-4xl font-light text-white">3 days</p>
                    <span className="text-sm text-zinc-400">free trial</span>
                    <p className="text-lg text-zinc-500 mt-1">then $15/month</p>
                  </>
                ) : (
                  <>
                    <p className="text-4xl font-light text-white">$15</p>
                    <span className="text-sm text-zinc-400">/month</span>
                  </>
                )}
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

            {subscriptionStatus?.currentPlan === "creator_vip" ? (
              <Button
                onClick={() => router.push("/dashboard/profile?tab=membership")}
                variant="outline"
                className="w-full border-cyan-400/50 bg-cyan-500/10 text-cyan-300"
              >
                Manage Subscription
              </Button>
            ) : (
              <Button
                onClick={() => handleUpgradeClick("creator_vip")}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white"
              >
                Upgrade to Creator VIP
              </Button>
            )}
          </div>
        </Card>
      </div>

      {!isPayingOrOnTrial && !statusLoading && (
        <div className="mt-12 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-light text-white">Or Purchase Extra Bundles</h2>
            <p className="text-zinc-400">One-time purchases for additional bundle capacity</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {bundleOptions.map((option) => (
              <Card
                key={option.id}
                className={`relative overflow-hidden border ${
                  option.popular
                    ? "border-cyan-400/50 bg-gradient-to-br from-cyan-500/10 to-blue-500/10"
                    : "border-zinc-700/50 bg-gradient-to-br from-zinc-900/90 to-black/90"
                }`}
              >
                {option.popular && (
                  <div className="absolute right-0 top-0 bg-gradient-to-r from-cyan-400 to-blue-400 px-3 py-1 text-xs font-bold text-black">
                    POPULAR
                  </div>
                )}

                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        option.popular
                          ? "bg-cyan-500/20 border border-cyan-400/30"
                          : "bg-zinc-800/50 border border-zinc-700/50"
                      }`}
                    >
                      <option.icon className={`h-5 w-5 ${option.popular ? "text-cyan-300" : "text-zinc-300"}`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white">{option.name}</h3>
                      <p className="text-sm text-zinc-400">{option.description}</p>
                    </div>
                  </div>

                  <div className="text-center py-2">
                    <p className="text-3xl font-light text-white">${option.price}</p>
                    <span className="text-sm text-zinc-400">one-time</span>
                  </div>

                  <Button
                    onClick={() => handleBundlePurchase(option.id)}
                    disabled={purchasingBundle === option.id}
                    className={`w-full ${
                      option.popular
                        ? "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400"
                        : "bg-zinc-700 hover:bg-zinc-600"
                    } text-white`}
                  >
                    {purchasingBundle === option.id ? "Processing..." : "Purchase"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
