"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Check, Crown, Shield } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

export default function FreeTrialPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [startingTrial, setStartingTrial] = useState(false)
  const [checkingEligibility, setCheckingEligibility] = useState(true)
  const [shouldRedirect, setShouldRedirect] = useState(false)
  const [upgradingTo, setUpgradingTo] = useState<"starter" | "creator_vip" | null>(null)

  console.log("[v0] Free trial page loaded, user:", user?.uid, "loading:", loading)

  useEffect(() => {
    const checkTrialEligibility = async () => {
      if (!user) return

      try {
        const idToken = await user.getIdToken()
        const response = await fetch("/api/user/trial-status", {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          console.log("[v0] Trial eligibility check:", data)

          if (data.hasActiveCreatorPro || data.hasUsedFreeTrial || data.isOnTrial) {
            console.log("[v0] User not eligible for trial, redirecting to dashboard")
            setShouldRedirect(true)
            router.push("/dashboard")
            return
          }
        }
      } catch (error) {
        console.error("[v0] Error checking trial eligibility:", error)
      } finally {
        setCheckingEligibility(false)
      }
    }

    if (!loading && user) {
      checkTrialEligibility()
    }
  }, [user, loading, router])

  useEffect(() => {
    console.log("[v0] Free trial page useEffect, user:", user?.uid, "loading:", loading)
    if (!loading && !user) {
      console.log("[v0] No user found, redirecting to login")
      router.push("/login")
    }
  }, [user, loading, router])

  const handleStartTrial = async () => {
    console.log("[v0] Starting free trial for user:", user?.uid)
    setStartingTrial(true)
    try {
      const idToken = await user?.getIdToken()

      // Call API to start free trial
      const response = await fetch("/api/trial/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
      })

      console.log("[v0] Trial start API response status:", response.status)

      if (!response.ok) {
        throw new Error("Failed to start trial")
      }

      const data = await response.json()
      console.log("[v0] Trial started successfully:", data)

      // Redirect to dashboard
      console.log("[v0] Redirecting to /dashboard/vex")
      window.location.href = "/dashboard/vex"
    } catch (error) {
      console.error("[v0] Error starting trial:", error)
      setStartingTrial(false)
    }
  }

  const handleSkip = async () => {
    console.log("[v0] Skipping trial for user:", user?.uid)
    try {
      // Mark user as no longer new
      const response = await fetch("/api/user/mark-onboarded", {
        method: "POST",
      })

      console.log("[v0] Mark onboarded API response status:", response.status)

      console.log("[v0] Redirecting to /dashboard/vex")
      router.push("/dashboard/vex")
    } catch (error) {
      console.error("[v0] Error skipping trial:", error)
      router.push("/dashboard/vex")
    }
  }

  const handleUpgradeClick = async (plan: "starter" | "creator_vip") => {
    try {
      setUpgradingTo(plan)
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
        console.warn("[Welcome] Failed to create checkout session")
        setUpgradingTo(null)
        return
      }

      const data = (await res.json()) as { url?: string }
      if (data?.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error("[Welcome] Error starting checkout:", err)
      setUpgradingTo(null)
    }
  }

  if (loading || checkingEligibility || shouldRedirect) {
    console.log("[v0] Free trial page still loading...")
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
        {/* Background gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />

        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-gray-400 text-lg">{shouldRedirect ? "Redirecting..." : "Checking eligibility..."}</p>
        </div>
      </div>
    )
  }

  console.log("[v0] Rendering free trial page")

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-to-tl from-white/3 via-white/1 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/1 to-white/2" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

      {/* Content */}
      <div className="relative z-10 max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 mb-4">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-cyan-300 font-medium">Limited Time Offer</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-thin bg-gradient-to-br from-slate-300 via-cyan-200 via-blue-100 to-white bg-clip-text text-transparent">
            Try Creator Pro Free
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Experience the full power of Vex AI with a 3-day free trial. No credit card required.
          </p>
        </div>

        {/* Comparison Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Starter Plan */}
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                <Shield className="h-6 w-6 text-zinc-300" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-white">Starter Plan</h3>
                <p className="text-gray-400">For new creators testing the waters</p>
              </div>
            </div>

            <div className="text-center mb-6 py-4">
              <p className="text-5xl font-light text-white">$3</p>
              <span className="text-sm text-gray-400">/month</span>
            </div>

            <ul className="space-y-4 mb-6">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300">3 folders with subfolders</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300">5 bundles max on storefront</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300">15 videos per bundle limit</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300">Basic Vex AI - file metadata & folder organization</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300">20% platform fee on sales</span>
              </li>
            </ul>

            <Button
              onClick={() => handleUpgradeClick("starter")}
              disabled={upgradingTo !== null}
              className="w-full bg-gradient-to-r from-slate-500 to-cyan-500 hover:from-slate-400 hover:to-cyan-400 text-white py-6 text-lg"
            >
              {upgradingTo === "starter" ? "Processing..." : "Get Started"}
            </Button>
          </div>

          {/* Creator Pro Trial */}
          <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm border-2 border-cyan-500/30 rounded-2xl p-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <div className="px-4 py-1 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-medium">
                RECOMMENDED
              </div>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-400/30">
                <Crown className="h-6 w-6 text-cyan-300" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-white">Creator Pro</h3>
                <p className="text-cyan-300">Everything you need to succeed</p>
              </div>
            </div>

            <div className="text-center mb-6 py-4">
              <p className="text-5xl font-light text-white">3 days</p>
              <span className="text-sm text-cyan-300">free trial</span>
              <p className="text-lg text-gray-400 mt-2">then $15/month</p>
            </div>

            <ul className="space-y-4 mb-6">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-white font-medium">Unlimited folders with subfolders</span>
                  <p className="text-sm text-gray-400 mt-1">Organize your content your way</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-white font-medium">Unlimited bundles & videos</span>
                  <p className="text-sm text-gray-400 mt-1">No limits on your creativity</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-white font-medium">Full Vex AI with bundle creation</span>
                  <p className="text-sm text-gray-400 mt-1">Let AI create bundles for you</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-white font-medium">Transcript analysis</span>
                  <p className="text-sm text-gray-400 mt-1">AI-powered content insights</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-white font-medium">Only 10% platform fee</span>
                  <p className="text-sm text-gray-400 mt-1">Keep more of what you earn</p>
                </div>
              </li>
            </ul>

            <Button
              onClick={() => handleUpgradeClick("creator_vip")}
              disabled={upgradingTo !== null}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold py-6 text-lg shadow-lg shadow-cyan-500/25"
            >
              {upgradingTo === "creator_vip" ? "Processing..." : "Start 3-Day Free Trial"}
            </Button>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            onClick={handleStartTrial}
            disabled={startingTrial || upgradingTo !== null}
            className="w-full sm:w-auto px-8 py-6 text-lg bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-cyan-500/25"
          >
            {startingTrial || upgradingTo === "creator_vip" ? (
              <>
                <Shield className="w-5 h-5 mr-2 animate-pulse" />
                Processing...
              </>
            ) : (
              <>
                <Shield className="w-5 h-5 mr-2" />
                Start 3-Day Free Trial
              </>
            )}
          </Button>
          <Button
            onClick={handleSkip}
            variant="ghost"
            className="w-full sm:w-auto px-8 py-6 text-lg text-gray-400 hover:text-white hover:bg-gray-800/50"
          >
            Continue with Free Plan
          </Button>
        </div>

        {/* Fine print */}
        <p className="text-center text-sm text-gray-500 mt-8">
          All plans require payment information. Cancel anytime during the trial period.
        </p>
      </div>
    </div>
  )
}
