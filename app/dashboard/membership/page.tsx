"use client"

import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { CheckCircle2, Crown, Shield, Zap, Download, ArrowLeft } from "lucide-react"
import { SubscribeButton } from "@/components/subscribe-button"
import { useAuth } from "@/contexts/auth-context"
import { useUserPlan } from "@/hooks/use-user-plan"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function MembershipPage() {
  const { user } = useAuth()
  const { isProUser, loading } = useUserPlan()
  const router = useRouter()

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1.0],
      },
    },
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-zinc-400 hover:text-white">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Membership Plans</h1>
          <p className="text-zinc-400 mt-1">Unlock premium features to accelerate your content creation workflow</p>
        </div>
      </div>

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
        {/* Plans Grid */}
        <motion.div variants={itemVariants} className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Plan */}
          <Card
            className={`bg-zinc-900/30 border ${!isProUser ? "border-red-600" : "border-zinc-800/50"} backdrop-blur-sm relative`}
          >
            {!isProUser && !loading && (
              <div className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                CURRENT PLAN
              </div>
            )}
            <CardHeader>
              <div className="flex items-center mb-4">
                <Shield className="h-6 w-6 text-zinc-400 mr-2" />
                <CardTitle className="text-2xl">Free</CardTitle>
              </div>
              <CardDescription>Get started with basic features</CardDescription>
              <p className="text-4xl font-semibold text-white">
                $0<span className="text-xl text-zinc-400">/month</span>
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              <ul className="space-y-4">
                <li className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>15 downloads per month</strong>
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Access to free content</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Standard video quality</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Basic content organization</span>
                </li>
              </ul>

              {isProUser ? (
                <Button
                  onClick={() => router.push("/dashboard")}
                  variant="outline"
                  className="w-full border-zinc-800 bg-zinc-900/30 text-white hover:bg-zinc-900/50 hover:border-zinc-700"
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
            </CardContent>
          </Card>

          {/* Creator Pro Plan */}
          <Card
            className={`bg-zinc-900/30 border ${isProUser ? "border-red-600" : "border-zinc-800/50"} backdrop-blur-sm relative`}
          >
            {!loading && (
              <div className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                {isProUser ? "CURRENT PLAN" : "RECOMMENDED"}
              </div>
            )}
            <CardHeader>
              <div className="flex items-center mb-4">
                <Crown className="h-6 w-6 text-yellow-500 mr-2" />
                <CardTitle className="text-2xl">Creator Pro</CardTitle>
              </div>
              <CardDescription>Everything you need to create amazing content</CardDescription>
              <p className="text-4xl font-semibold text-white">
                $19<span className="text-xl text-zinc-400">/month</span>
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              <ul className="space-y-4">
                <li className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Unlimited downloads</strong>
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Access to all premium content</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>High video quality</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Priority support</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Advanced organization features</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Only 10% platform fee</span>
                </li>
              </ul>

              {isProUser ? (
                <Button
                  onClick={() => router.push("/dashboard/profile?tab=membership")}
                  variant="outline"
                  className="w-full border-red-600 bg-black/30 text-white hover:bg-red-600/10"
                >
                  Manage Subscription
                </Button>
              ) : (
                <SubscribeButton className="w-full bg-red-600 hover:bg-red-700">Upgrade to Creator Pro</SubscribeButton>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Features Section */}
        <motion.div variants={itemVariants} className="max-w-3xl mx-auto">
          <h3 className="text-xl font-medium text-white mb-6 text-center">Why Choose MassClip Creator Pro?</h3>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-zinc-900/30 border-zinc-800/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <Download className="h-8 w-8 text-red-600 mb-4" />
                <h4 className="text-lg font-medium text-white mb-2">Unlimited Downloads</h4>
                <p className="text-zinc-400">Download as many clips as you need without any monthly restrictions</p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/30 border-zinc-800/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <Zap className="h-8 w-8 text-red-600 mb-4" />
                <h4 className="text-lg font-medium text-white mb-2">Premium Content</h4>
                <p className="text-zinc-400">Access our entire library of high-quality, professionally curated clips</p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/30 border-zinc-800/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <Shield className="h-8 w-8 text-red-600 mb-4" />
                <h4 className="text-lg font-medium text-white mb-2">Advanced Organization</h4>
                <p className="text-zinc-400">
                  Enjoy dynamic content organization with shuffled videos for a fresh experience
                </p>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
