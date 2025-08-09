"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Crown, Shield } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { useUserPlan } from "@/hooks/use-user-plan"

export default function MembershipPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { isProUser, loading } = useUserPlan()
  const [selectedPlan, setSelectedPlan] = useState<"free" | "pro">(isProUser ? "pro" : "free")

  const handleUpgradeClick = () => {
    window.open("https://buy.stripe.com/14A6oHeWEeJngFv4SzeIw04", "_blank")
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
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                Upgrade to Creator Pro
              </Button>
            )}
          </div>
        </Card>
      </div>

      <div>
        <h3 className="mb-8 text-center text-2xl font-medium text-white">Frequently Asked Questions</h3>

        <div className="space-y-4">
          <Card className="overflow-hidden border-zinc-800/50 bg-gradient-to-b from-zinc-900/50 to-black/70 transition-all duration-300 hover:border-zinc-700/70">
            <div className="p-6">
              <h4 className="mb-3 text-lg font-medium text-white">What are bundle video limits?</h4>
              <p className="text-zinc-400">
                Free users can include up to 10 videos in each bundle they create. Creator Pro users have no limits 
                and can include as many videos as they want in their bundles, perfect for comprehensive content packages.
              </p>
            </div>
          </Card>

          <Card className="overflow-hidden border-zinc-800/50 bg-gradient-to-b from-zinc-900/50 to-black/70 transition-all duration-300 hover:border-zinc-700/70">
            <div className="p-6">
              <h4 className="mb-3 text-lg font-medium text-white">What are platform fees?</h4>
              <p className="text-zinc-400">
                Platform fees are charged on each sale to cover payment processing, hosting, and platform maintenance. 
                Free users pay 20% while Creator Pro users enjoy a reduced 10% fee, helping you keep more of your earnings.
              </p>
            </div>
          </Card>

          <Card className="overflow-hidden border-zinc-800/50 bg-gradient-to-b from-zinc-900/50 to-black/70 transition-all duration-300 hover:border-zinc-700/70">
            <div className="p-6">
              <h4 className="mb-3 text-lg font-medium text-white">Can I cancel my subscription?</h4>
              <p className="text-zinc-400">
                Yes, you can cancel your subscription anytime. You'll continue to have access until the end of your
                billing period, after which you'll return to the Free plan with bundle video limits and 20% platform fees.
              </p>
            </div>
          </Card>

          <Card className="overflow-hidden border-zinc-800/50 bg-gradient-to-b from-zinc-900/50 to-black/70 transition-all duration-300 hover:border-zinc-700/70">
            <div className="p-6">
              <h4 className="mb-3 text-lg font-medium text-white">What payment methods do you accept?</h4>
              <p className="text-zinc-400">
                We accept all major credit cards, including Visa, Mastercard, and American Express.
              </p>
            </div>
          </Card>

          <Card className="overflow-hidden border-zinc-800/50 bg-gradient-to-b from-zinc-900/50 to-black/70 transition-all duration-300 hover:border-zinc-700/70">
            <div className="p-6">
              <h4 className="mb-3 text-lg font-medium text-white">How do I get started?</h4>
              <p className="text-zinc-400">
                Simply click the "Upgrade to Creator Pro" button, complete the checkout process, and you'll have
                immediate access to all Creator Pro features including unlimited videos per bundle and the reduced 10% platform fee.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
