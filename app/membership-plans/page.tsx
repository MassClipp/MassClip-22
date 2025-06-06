"use client"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { CheckCircle2, Crown, Shield, Zap, Download } from "lucide-react"
import DashboardHeader from "@/components/dashboard-header"
import { SubscribeButton } from "@/components/subscribe-button"
import { useAuth } from "@/contexts/auth-context"
import { useUserPlan } from "@/hooks/use-user-plan"
import { Button } from "@/components/ui/button"

export default function MembershipPlansPage() {
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
    <div className="relative min-h-screen bg-black text-white">
      {/* Premium Gradient Background */}
      <div className="fixed inset-0 z-0 premium-gradient">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-soft-light"></div>
      </div>

      <DashboardHeader />

      <main className="pt-20 pb-16 relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          <motion.div variants={itemVariants} className="text-center mb-12">
            <h1 className="text-4xl font-extralight tracking-tight text-white mb-4">Membership Plans</h1>
            <p className="text-xl text-zinc-400 max-w-3xl mx-auto font-light">
              Unlock premium features to accelerate your content creation workflow
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div
              className={`bg-zinc-900/30 rounded-lg overflow-hidden border ${!isProUser ? "border-crimson" : "border-zinc-800/50"} backdrop-blur-sm relative`}
            >
              {!isProUser && !loading && (
                <div className="absolute top-0 right-0 bg-crimson text-white text-xs font-bold px-3 py-1">
                  CURRENT PLAN
                </div>
              )}
              <div className="p-8">
                <div className="flex items-center mb-4">
                  <Shield className="h-6 w-6 text-zinc-400 mr-2" />
                  <h2 className="text-2xl font-light text-white">Free</h2>
                </div>
                <p className="text-zinc-400 mb-6 font-light">Get started with basic features</p>
                <p className="text-4xl font-light text-white mb-6">
                  $0<span className="text-xl text-zinc-400">/month</span>
                </p>

                <ul className="space-y-4 mb-8">
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="font-light">
                      <strong>10 downloads per month</strong>
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="font-light">Access to free clips</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="font-light">Standard video quality</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="font-light">Limited organization features</span>
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
                    className="w-full border-crimson bg-black/30 text-white hover:bg-crimson/10"
                  >
                    Current Plan
                  </Button>
                )}
              </div>
            </div>

            {/* Creator Pro Plan */}
            <div
              className={`bg-zinc-900/30 rounded-lg overflow-hidden border ${isProUser ? "border-crimson" : "border-zinc-800/50"} backdrop-blur-sm relative`}
            >
              {!loading && (
                <div className="absolute top-0 right-0 bg-crimson text-white text-xs font-bold px-3 py-1">
                  {isProUser ? "CURRENT PLAN" : "RECOMMENDED"}
                </div>
              )}
              <div className="p-8">
                <div className="flex items-center mb-4">
                  <Crown className="h-6 w-6 text-yellow-500 mr-2" />
                  <h2 className="text-2xl font-light text-white">Creator Pro</h2>
                </div>
                <p className="text-zinc-400 mb-6 font-light">Everything you need to create amazing content</p>
                <p className="text-4xl font-light text-white mb-6">
                  $19<span className="text-xl text-zinc-400">/month</span>
                </p>

                <ul className="space-y-4 mb-8">
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="font-light">
                      <strong>Unlimited downloads</strong>
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="font-light">Access to all clips</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="font-light">High video quality</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="font-light">Priority support</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="font-light">Advanced organization features</span>
                  </li>
                </ul>

                {isProUser ? (
                  <Button
                    onClick={() => router.push("/dashboard/user")}
                    variant="outline"
                    className="w-full border-crimson bg-black/30 text-white hover:bg-crimson/10"
                  >
                    Manage Subscription
                  </Button>
                ) : (
                  <SubscribeButton className="w-full bg-crimson hover:bg-crimson-dark">
                    Upgrade to Creator Pro
                  </SubscribeButton>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="mt-16 text-center max-w-3xl mx-auto">
            <h3 className="text-2xl font-light text-white mb-6">Why Choose MassClip Creator Pro?</h3>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-6 backdrop-blur-sm">
                <Download className="h-8 w-8 text-crimson mb-4" />
                <h4 className="text-lg font-medium text-white mb-2">Unlimited Downloads</h4>
                <p className="text-zinc-400 font-light">
                  Download as many clips as you need without any monthly restrictions
                </p>
              </div>

              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-6 backdrop-blur-sm">
                <Zap className="h-8 w-8 text-crimson mb-4" />
                <h4 className="text-lg font-medium text-white mb-2">Premium Content</h4>
                <p className="text-zinc-400 font-light">
                  Access our entire library of high-quality, professionally curated clips
                </p>
              </div>

              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-6 backdrop-blur-sm">
                <Shield className="h-8 w-8 text-crimson mb-4" />
                <h4 className="text-lg font-medium text-white mb-2">Advanced Organization</h4>
                <p className="text-zinc-400 font-light">
                  Enjoy dynamic content organization with shuffled videos for a fresh experience
                </p>
              </div>
            </div>

            <h3 className="text-2xl font-light text-white mb-6">Frequently Asked Questions</h3>

            <div className="space-y-8 text-left">
              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-6 backdrop-blur-sm">
                <h4 className="text-lg font-medium text-white mb-2">Can I cancel my subscription?</h4>
                <p className="text-zinc-400 font-light">
                  Yes, you can cancel your subscription anytime. You'll continue to have access until the end of your
                  billing period.
                </p>
              </div>

              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-6 backdrop-blur-sm">
                <h4 className="text-lg font-medium text-white mb-2">What payment methods do you accept?</h4>
                <p className="text-zinc-400 font-light">
                  We accept all major credit cards, including Visa, Mastercard, and American Express.
                </p>
              </div>

              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-6 backdrop-blur-sm">
                <h4 className="text-lg font-medium text-white mb-2">How do I get started?</h4>
                <p className="text-zinc-400 font-light">
                  Simply click the "Upgrade to Creator Pro" button, complete the checkout process, and you'll have
                  immediate access to all Creator Pro features.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}
