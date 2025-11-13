"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, Crown, Shield, Package, Loader2 } from "lucide-react"
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
    currentPlan: "starter" | "faceless_pro" | "facelessprenuer" | null
    hasUsedFreeTrial: boolean
  } | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [checkingOut, setCheckingOut] = useState(false)
  const [trialEligibility, setTrialEligibility] = useState<{
    shouldShowTrial: boolean
    hasUsedFreeTrial: boolean
    priceId: string
  } | null>(null)

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

        const trialEligibilityRes = await fetch("/api/stripe/checkout/pricing", {
          headers: { Authorization: `Bearer ${idToken}` },
        })

        if (trialEligibilityRes.ok) {
          const trialData = await trialEligibilityRes.json()
          console.log("[v0] Trial eligibility from pricing API:", trialData)
          setTrialEligibility(trialData)
        }

        const trialRes = await fetch("/api/user/trial-status", {
          headers: { Authorization: `Bearer ${idToken}` },
        })
        const trialData = await trialRes.json()

        const membershipRes = await fetch("/api/membership-status", {
          headers: { Authorization: `Bearer ${idToken}` },
        })
        const membershipData = await membershipRes.json()

        console.log("[v0] Subscription status:", {
          trial: trialData,
          membership: membershipData,
        })

        const hasActiveSubscription =
          membershipData.isActive || (membershipData.status === "canceled" && membershipData.cancelAtPeriodEnd)
        const isOnTrial = trialData.isOnTrial || membershipData.status === "trialing"

        let currentPlan: "faceless_pro" | "facelessprenuer" | null = null
        if (hasActiveSubscription || isOnTrial) {
          if (membershipData.plan === "facelessprenuer") {
            currentPlan = "facelessprenuer"
          } else if (membershipData.plan === "faceless_pro") {
            currentPlan = "faceless_pro"
          }
        }

        setSubscriptionStatus({
          hasActiveSubscription,
          isOnTrial,
          currentPlan,
          hasUsedFreeTrial: trialData.hasUsedFreeTrial || trialData.hasActiveCreatorVIP || false,
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

  const handleUpgradeClick = async (plan: "faceless_pro" | "facelessprenuer") => {
    if (checkingOut) return // Prevent double clicks

    try {
      setCheckingOut(true)
      console.log("[v0] Starting checkout for plan:", plan)

      const idToken = await user?.getIdToken?.()
      if (!idToken) {
        console.error("[v0] No auth token available")
        return
      }

      const res = await fetch("/api/stripe/checkout/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          plan, // Now passing "faceless_pro" or "facelessprenuer" directly
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        console.error("[v0] Checkout failed:", errorData)
        return
      }

      const data = (await res.json()) as { url?: string }
      if (data?.url) {
        console.log("[v0] Redirecting to checkout:", data.url)
        window.location.href = data.url
      }
    } catch (err) {
      console.error("[v0] Error starting checkout:", err)
    } finally {
      setTimeout(() => setCheckingOut(false), 2000) // Reset after 2 seconds
    }
  }

  const isPayingOrOnTrial = subscriptionStatus?.hasActiveSubscription || subscriptionStatus?.isOnTrial
  const showFirstWeekPromo = false

  const showTrialButtonForFacelessprenuer =
    trialEligibility?.shouldShowTrial &&
    !subscriptionStatus?.isOnTrial &&
    subscriptionStatus?.currentPlan !== "facelessprenuer"

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-cyan-400" />
          <p className="text-zinc-400">Loading plans...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-safe">
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
          Get Your Storefront Live With{" "}
          <span className="bg-gradient-to-br from-slate-300 via-cyan-200 to-white bg-clip-text text-transparent">
            These Plans
          </span>
        </h1>
        <p className="text-lg text-white/70 max-w-2xl mx-auto">Select the plan that fits your content creation needs</p>
      </div>

      <div className="space-y-6">
        {/* Faceless Pro Plan */}
        <Card className="relative overflow-hidden border border-zinc-700/50 bg-gradient-to-br from-zinc-900/90 to-black/90">
          {subscriptionStatus?.currentPlan === "faceless_pro" && (
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
                  <h2 className="text-2xl font-light text-white">Faceless Pro</h2>
                  <p className="text-zinc-400">
                    Take your first step towards earning consistently on a storefront to sell your content
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-4xl font-light text-white">$29</p>
                <span className="text-sm text-zinc-400">/month</span>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {[
                { text: "3 folders with subfolders", highlight: true },
                { text: "5 bundles max on storefront", highlight: false },
                { text: "25 videos per bundle limit", highlight: false },
                { text: "Basic Vex AI - file metadata & folder organization", highlight: false },
                { text: "15% platform fee on sales", highlight: false },
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <CheckCircle2 className={`h-4 w-4 ${feature.highlight ? "text-cyan-400" : "text-zinc-500"}`} />
                  <span className="text-white text-sm">{feature.text}</span>
                </div>
              ))}
            </div>

            {subscriptionStatus?.currentPlan === "faceless_pro" ? (
              <Button
                onClick={() => router.push("/dashboard/profile?tab=membership")}
                variant="outline"
                className="w-full border-cyan-400/50 bg-cyan-500/10 text-cyan-300"
              >
                Manage Membership
              </Button>
            ) : (
              <Button
                onClick={() => handleUpgradeClick("faceless_pro")}
                disabled={checkingOut}
                className="w-full bg-gradient-to-r from-slate-500 to-cyan-500 hover:from-slate-400 hover:to-cyan-400 text-white disabled:opacity-50"
              >
                {checkingOut ? "Processing..." : "Get Started"}
              </Button>
            )}
          </div>
        </Card>

        {/* Facelessprenuer Plan */}
        <Card className="relative overflow-hidden border border-zinc-700/50 bg-gradient-to-br from-zinc-900/90 to-black/90">
          {!statusLoading && (
            <div className="absolute right-0 top-0 bg-gradient-to-r from-cyan-400 to-blue-400 px-3 py-1 text-xs font-bold text-black">
              {subscriptionStatus?.currentPlan === "facelessprenuer" ? "CURRENT PLAN" : "RECOMMENDED"}
            </div>
          )}

          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div className="flex items-start md:items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 flex-shrink-0">
                  <Crown className="h-6 w-6 text-cyan-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-light text-white">Facelessprenuer</h2>
                  <p className="text-sm md:text-base text-zinc-400 line-clamp-2">
                    Scale your content selling business and manage your growth effectively
                  </p>
                </div>
              </div>
              <div className="text-left md:text-right flex-shrink-0">
                <p className="text-3xl md:text-4xl font-light text-white">$39</p>
                <span className="text-sm text-zinc-400">/month</span>
              </div>
            </div>

            {showTrialButtonForFacelessprenuer && !statusLoading && (
              <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-400/30">
                <p className="text-sm font-medium text-cyan-300 text-center">
                  🎁 3-Day Free Trial Available - First Time Offer
                </p>
              </div>
            )}

            <div className="space-y-2 mb-4">
              {[
                "Custom domains",
                "Create custom storefront tabs & products",
                "Fully customizable storefront",
                "Unlimited folders with subfolders",
                "Unlimited bundles on storefront",
                "Unlimited videos per bundle",
                "Full Vex AI - bundle creation & transcript analysis",
                "Only 10% platform fee on sales",
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span className="text-white text-sm leading-relaxed">{feature}</span>
                </div>
              ))}
            </div>

            {subscriptionStatus?.currentPlan === "facelessprenuer" ? (
              <Button
                onClick={() => router.push("/dashboard/profile?tab=membership")}
                variant="outline"
                className="w-full border-cyan-400/50 bg-cyan-500/10 text-cyan-300"
              >
                Manage Membership
              </Button>
            ) : (
              <Button
                onClick={() => handleUpgradeClick("facelessprenuer")}
                disabled={checkingOut}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white disabled:opacity-50"
              >
                {checkingOut ? "Processing..." : "Upgrade to Facelessprenuer"}
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
