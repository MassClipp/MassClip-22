"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, Crown, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { useUserPlan } from "@/hooks/use-user-plan"

export default function UpgradePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { isProUser, loading } = useUserPlan()
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)

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
      </div>
    </div>
  )
}
