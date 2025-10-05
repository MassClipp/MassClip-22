"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Crown, Sparkles, Zap, FolderTree, CheckCircle2, ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"

export default function WelcomePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [isStartingTrial, setIsStartingTrial] = useState(false)
  const [isSkipping, setIsSkipping] = useState(false)

  useEffect(() => {
    // Redirect if not authenticated
    if (!user) {
      router.push("/login")
    }
  }, [user, router])

  const handleStartTrial = async () => {
    try {
      setIsStartingTrial(true)
      const idToken = await user?.getIdToken?.()

      const res = await fetch("/api/stripe/checkout/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      })

      if (!res.ok) {
        console.error("[Welcome] Failed to create trial checkout session")
        return
      }

      const data = await res.json()
      if (data?.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error("[Welcome] Error starting trial:", err)
    } finally {
      setIsStartingTrial(false)
    }
  }

  const handleSkip = async () => {
    try {
      setIsSkipping(true)
      // Mark user as having seen onboarding
      const idToken = await user?.getIdToken?.()
      await fetch("/api/user/complete-onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
      })
      router.push("/dashboard/vex")
    } catch (err) {
      console.error("[Welcome] Error skipping:", err)
      router.push("/dashboard/vex")
    } finally {
      setIsSkipping(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Background gradient effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        {/* Logo/Brand */}
        <div className="mb-8 flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-black font-bold text-xl">M</span>
          </div>
          <span className="text-2xl font-light">MassClip</span>
        </div>

        {/* Main content */}
        <div className="max-w-4xl w-full space-y-12">
          {/* Hero section */}
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-sm">
              <Sparkles className="h-4 w-4" />
              <span>Limited Time Offer</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-light leading-tight">
              Start your{" "}
              <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-300 bg-clip-text text-transparent">
                free trial
              </span>
              <br />
              of Creator Pro
            </h1>

            <p className="text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
              Unlock the full power of MassClip with unlimited bundles, AI-powered content organization, and advanced
              monetization tools. No credit card required.
            </p>
          </div>

          {/* Features grid */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="group p-6 rounded-2xl bg-gradient-to-br from-zinc-900/50 to-black/50 border border-zinc-800/50 hover:border-cyan-400/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FolderTree className="h-6 w-6 text-cyan-300" />
              </div>
              <h3 className="text-lg font-medium mb-2">Unlimited Organization</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Create unlimited folders with subfolders to organize your content library perfectly
              </p>
            </div>

            <div className="group p-6 rounded-2xl bg-gradient-to-br from-zinc-900/50 to-black/50 border border-zinc-800/50 hover:border-cyan-400/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Sparkles className="h-6 w-6 text-cyan-300" />
              </div>
              <h3 className="text-lg font-medium mb-2">Full Vex AI Access</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Let AI create bundles, analyze transcripts, and organize your content automatically
              </p>
            </div>

            <div className="group p-6 rounded-2xl bg-gradient-to-br from-zinc-900/50 to-black/50 border border-zinc-800/50 hover:border-cyan-400/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Zap className="h-6 w-6 text-cyan-300" />
              </div>
              <h3 className="text-lg font-medium mb-2">Lower Platform Fees</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Keep 90% of your earnings with only 10% platform fee instead of 20%
              </p>
            </div>
          </div>

          {/* Comparison */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Free plan */}
            <div className="p-6 rounded-2xl bg-zinc-900/30 border border-zinc-800/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-zinc-800/50 flex items-center justify-center">
                  <Crown className="h-5 w-5 text-zinc-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-zinc-300">Free Plan</h3>
                  <p className="text-sm text-zinc-500">Limited features</p>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  "2 folders max (no subfolders)",
                  "2 bundles max",
                  "10 videos per bundle",
                  "Basic Vex AI only",
                  "20% platform fee",
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-zinc-400">
                    <div className="w-4 h-4 rounded-full border border-zinc-700 flex items-center justify-center">
                      <div className="w-2 h-2 bg-zinc-700 rounded-full" />
                    </div>
                    {feature}
                  </div>
                ))}
              </div>
            </div>

            {/* Creator Pro */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-400/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-gradient-to-r from-cyan-400 to-blue-400 px-3 py-1 text-xs font-bold text-black">
                14 DAYS FREE
              </div>
              <div className="flex items-center gap-3 mb-6 mt-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/30 to-blue-500/30 border border-cyan-400/50 flex items-center justify-center">
                  <Crown className="h-5 w-5 text-cyan-300" />
                </div>
                <div>
                  <h3 className="text-lg font-medium">Creator Pro</h3>
                  <p className="text-sm text-cyan-300">$15/month after trial</p>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  "Unlimited folders & subfolders",
                  "Unlimited bundles",
                  "Unlimited videos per bundle",
                  "Full Vex AI access",
                  "Only 10% platform fee",
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              onClick={handleStartTrial}
              disabled={isStartingTrial}
              size="lg"
              className="w-full sm:w-auto px-8 py-6 text-lg bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white border-0 shadow-lg shadow-cyan-500/25"
            >
              {isStartingTrial ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Starting trial...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  Start 14-Day Free Trial
                  <ArrowRight className="h-5 w-5" />
                </div>
              )}
            </Button>

            <Button
              onClick={handleSkip}
              disabled={isSkipping}
              size="lg"
              variant="ghost"
              className="w-full sm:w-auto px-8 py-6 text-lg text-white/60 hover:text-white hover:bg-white/5"
            >
              {isSkipping ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading...
                </div>
              ) : (
                "Continue with Free Plan"
              )}
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="text-center space-y-2">
            <p className="text-sm text-white/40">No credit card required • Cancel anytime • Full access during trial</p>
          </div>
        </div>
      </div>
    </div>
  )
}
