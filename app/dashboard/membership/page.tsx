"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Crown, Shield, Zap, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { useUserPlan } from "@/hooks/use-user-plan"

const TEMP_PAYMENT_LINK = "https://buy.stripe.com/aFa3cvbKsgRvexnfxdeIw05"

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
      const res = await fetch("/api/stripe/checkout/membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      })

      if (!res.ok) {
        console.warn("[Membership] Failed to create checkout session, falling back to payment link.")
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
    <div className="space-y-12 p-8">
      <div className="text-center space-y-4">
        <h1 className="text-5xl lg:text-6xl font-thin text-white leading-tight">
          Choose Your{" "}
          <span className="bg-gradient-to-br from-slate-300 via-cyan-200 via-blue-100 to-white bg-clip-text text-transparent">
            Creative
          </span>{" "}
          Journey
        </h1>
        <p className="text-xl text-white/70 font-light max-w-2xl mx-auto">
          Unlock premium features to accelerate your content creation workflow and maximize your earning potential
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Free Plan */}
        <Card
          className={`group relative overflow-hidden border-2 transition-all duration-500 ${
            selectedPlan === "free"
              ? "border-cyan-400/50 shadow-2xl shadow-cyan-500/20"
              : "border-zinc-700/50 hover:border-zinc-600/70"
          } bg-gradient-to-br from-zinc-900/90 via-zinc-800/80 to-black/90 backdrop-blur-xl`}
        >
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
        <Card
          className={`group relative overflow-hidden border-2 transition-all duration-500 ${
            selectedPlan === "pro"
              ? "border-cyan-400/50 shadow-2xl shadow-cyan-500/20"
              : "border-zinc-700/50 hover:border-zinc-600/70"
          } bg-gradient-to-br from-zinc-900/90 via-zinc-800/80 to-black/90 backdrop-blur-xl`}
        >
          {!loading && (
            <div className="absolute right-0 top-0 bg-gradient-to-r from-cyan-400 to-blue-400 px-4 py-2 text-sm font-bold text-black">
              {isProUser ? "CURRENT PLAN" : "RECOMMENDED"}
            </div>
          )}

          <div className="p-10">
            <div className="mb-8 flex items-center">
              <div className="mr-4 p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-400/30">
                <Crown className="h-8 w-8 text-cyan-300" />
              </div>
              <div>
                <h2 className="text-3xl font-light text-white">Creator Pro</h2>
                <p className="text-zinc-400 font-light">Everything you need to succeed</p>
              </div>
            </div>

            <div className="mb-8 flex items-baseline">
              <p className="text-6xl font-thin text-white">$15</p>
              <span className="ml-3 text-xl text-zinc-400 font-light">/month</span>
            </div>

            <ul className="mb-10 space-y-4">
              {[
                "Unlimited downloads",
                "Unlimited bundles on storefront",
                "Unlimited videos per bundle",
                "Access to all clips",
                "Priority support",
                "Only 10% platform fee on sales",
              ].map((feature, index) => (
                <li key={index} className="flex items-start">
                  <CheckCircle2 className="mr-4 mt-1 h-5 w-5 flex-shrink-0 text-cyan-400" />
                  <span className="text-white font-light">{feature}</span>
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
                disabled={isRedirecting}
                className="w-full py-4 text-lg font-medium rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white transition-all duration-300 shadow-lg shadow-cyan-500/25"
              >
                {isRedirecting ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Loading...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Zap className="mr-2 h-5 w-5" />
                    Upgrade to Creator Pro
                  </div>
                )}
              </Button>
            )}
          </div>
        </Card>
      </div>

      <div>
        <h3 className="mb-12 text-center text-4xl font-light text-white">
          Frequently Asked{" "}
          <span className="bg-gradient-to-br from-slate-300 via-cyan-200 via-blue-100 to-white bg-clip-text text-transparent">
            Questions
          </span>
        </h3>

        <div className="space-y-6">
          {[
            {
              question: "What are bundle video limits?",
              answer:
                "Free users can include up to 10 videos in each bundle they create. Creator Pro users have no limits and can include as many videos as they want in their bundles, perfect for comprehensive content packages.",
            },
            {
              question: "What are platform fees?",
              answer:
                "Platform fees are charged on each sale to cover payment processing, hosting, and platform maintenance. Free users pay 20% while Creator Pro users enjoy a reduced 10% fee, helping you keep more of your earnings.",
            },
            {
              question: "Can I cancel my subscription?",
              answer:
                "Yes, you can cancel your subscription anytime. You'll continue to have access until the end of your billing period, after which you'll return to the Free plan with bundle video limits and 20% platform fees.",
            },
            {
              question: "How do I get started?",
              answer:
                'Click "Upgrade to Creator Pro", complete checkout, and your membership will be activated automatically.',
            },
          ].map((faq, index) => (
            <Card
              key={index}
              className="overflow-hidden border-zinc-700/30 bg-gradient-to-br from-zinc-900/50 to-zinc-800/30 backdrop-blur-sm transition-all duration-300 hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/10"
            >
              <div className="p-8">
                <h4 className="mb-4 text-xl font-light text-white flex items-center">
                  <Star className="mr-3 h-5 w-5 text-cyan-400" />
                  {faq.question}
                </h4>
                <p className="text-zinc-300 font-light leading-relaxed pl-8">{faq.answer}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
