"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Check, Sparkles, Zap } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

export default function FreeTrialPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [startingTrial, setStartingTrial] = useState(false)
  const [checkingEligibility, setCheckingEligibility] = useState(true)

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

          // If user has active Creator Pro or already used trial, redirect to dashboard
          if (data.hasActiveCreatorPro || data.hasUsedFreeTrial || data.isOnTrial) {
            console.log("[v0] User not eligible for trial, redirecting to dashboard")
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

  // Redirect if not authenticated
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

  if (loading || checkingEligibility) {
    console.log("[v0] Free trial page still loading...")
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
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
            <Sparkles className="w-4 h-4 text-cyan-400" />
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
          {/* Free Plan */}
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8">
            <div className="mb-6">
              <h3 className="text-2xl font-semibold text-white mb-2">Free Plan</h3>
              <p className="text-gray-400">Basic features to get started</p>
            </div>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-400">2 folders max (no subfolders)</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-400">2 bundles on storefront</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-400">10 videos per bundle</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-400">Basic Vex AI - organization only</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-400">20% platform fee</span>
              </li>
            </ul>
          </div>

          {/* Creator Pro Trial */}
          <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm border-2 border-cyan-500/30 rounded-2xl p-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <div className="px-4 py-1 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-medium">
                3-Day Free Trial
              </div>
            </div>
            <div className="mb-6">
              <h3 className="text-2xl font-semibold text-white mb-2">Creator Pro</h3>
              <p className="text-cyan-300">Everything you need to succeed</p>
            </div>
            <ul className="space-y-4">
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
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            onClick={handleStartTrial}
            disabled={startingTrial}
            className="w-full sm:w-auto px-8 py-6 text-lg bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-cyan-500/25"
          >
            {startingTrial ? (
              <>
                <Zap className="w-5 h-5 mr-2 animate-pulse" />
                Starting Trial...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 mr-2" />
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
          Your trial will automatically convert to the free plan after 3 days. No credit card required.
        </p>
      </div>
    </div>
  )
}
