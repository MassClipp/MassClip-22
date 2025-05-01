"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Crown, CheckCircle2, AlertCircle } from "lucide-react"
import DashboardHeader from "@/components/dashboard-header"
import { useAuth } from "@/contexts/auth-context"
import { useUserPlan } from "@/hooks/use-user-plan"
import { CancelSubscriptionButton } from "@/components/cancel-subscription-button"
import { SubscribeButton } from "@/components/subscribe-button"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function UserPage() {
  const { user } = useAuth()
  const { planData, isProUser, loading } = useUserPlan()
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
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

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Please log in to view your profile.</p>
      </div>
    )
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
          className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          <motion.div variants={itemVariants} className="mb-8">
            <h1 className="text-3xl font-extralight tracking-tight text-white">Your Account</h1>
            <p className="text-zinc-400 mt-2 font-light">Manage your account settings and subscription</p>
          </motion.div>

          <motion.div variants={itemVariants} className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-6 backdrop-blur-sm col-span-2">
              <h2 className="text-xl font-light text-white mb-4">Profile Information</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-zinc-400">Email</p>
                  <p className="text-white">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Display Name</p>
                  <p className="text-white">{user.displayName || "Not set"}</p>
                </div>
                <div className="pt-2">
                  <Button
                    onClick={() => router.push("/dashboard/profile")}
                    variant="outline"
                    className="border-zinc-800 bg-zinc-900/30 text-white hover:bg-zinc-900/50 hover:border-zinc-700"
                  >
                    Edit Profile
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-6 backdrop-blur-sm">
              <h2 className="text-xl font-light text-white mb-4">Security</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-zinc-400">Password</p>
                  <p className="text-white">••••••••</p>
                </div>
                <div className="pt-2">
                  <Button
                    onClick={() => router.push("/dashboard/password")}
                    variant="outline"
                    className="border-zinc-800 bg-zinc-900/30 text-white hover:bg-zinc-900/50 hover:border-zinc-700"
                  >
                    Change Password
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-6 backdrop-blur-sm mb-8">
              <div className="flex items-center mb-4">
                <Crown className="h-5 w-5 text-yellow-500 mr-2" />
                <h2 className="text-xl font-light text-white">Your Subscription</h2>
              </div>
              <p className="text-zinc-400 mb-6 font-light">Manage your subscription plan</p>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">
                    Current Plan:{" "}
                    <span className={isProUser ? "text-yellow-500" : ""}>{isProUser ? "Creator Pro" : "Free"}</span>
                  </h3>

                  {isProUser ? (
                    <ul className="space-y-3 mb-6">
                      <li className="flex items-start">
                        <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="font-light">Unlimited downloads</span>
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
                    </ul>
                  ) : (
                    <ul className="space-y-3 mb-6">
                      <li className="flex items-start">
                        <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="font-light">5 downloads per month</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="font-light">Access to free clips</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="font-light">Standard video quality</span>
                      </li>
                    </ul>
                  )}

                  {isProUser ? (
                    <>
                      {showCancelConfirm ? (
                        <div className="space-y-4">
                          <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-md p-4">
                            <div className="flex items-start mb-2">
                              <AlertCircle className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
                              <p className="text-white font-medium">Are you sure you want to cancel?</p>
                            </div>
                            <p className="text-zinc-400 text-sm mb-4">
                              You'll lose access to all Creator Pro features at the end of your current billing period.
                            </p>
                            <div className="flex space-x-3">
                              <CancelSubscriptionButton className="bg-red-600 hover:bg-red-700 text-white" />
                              <Button
                                onClick={() => setShowCancelConfirm(false)}
                                variant="outline"
                                className="border-zinc-700 bg-zinc-800/50"
                              >
                                Keep Subscription
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <Button
                          onClick={() => setShowCancelConfirm(true)}
                          variant="outline"
                          className="border-zinc-800 bg-zinc-900/30 text-white hover:bg-zinc-900/50 hover:border-zinc-700"
                        >
                          Cancel Subscription
                        </Button>
                      )}
                    </>
                  ) : (
                    <Link href="/membership-plans" className="inline-block">
                      <Button className="bg-crimson hover:bg-crimson-dark text-white">View Plan Options</Button>
                    </Link>
                  )}
                </div>

                {!isProUser && (
                  <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-white mb-4">Upgrade to Pro</h3>
                    <p className="text-zinc-400 mb-4 font-light">Get unlimited access to all premium features</p>
                    <ul className="space-y-3 mb-6">
                      <li className="flex items-start">
                        <CheckCircle2 className="h-5 w-5 text-crimson mr-2 flex-shrink-0 mt-0.5" />
                        <span className="font-light">Access to ALL premium clips</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle2 className="h-5 w-5 text-crimson mr-2 flex-shrink-0 mt-0.5" />
                        <span className="font-light">Unlimited downloads</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle2 className="h-5 w-5 text-crimson mr-2 flex-shrink-0 mt-0.5" />
                        <span className="font-light">High video quality</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle2 className="h-5 w-5 text-crimson mr-2 flex-shrink-0 mt-0.5" />
                        <span className="font-light">Priority support</span>
                      </li>
                    </ul>
                    <SubscribeButton className="w-full bg-crimson hover:bg-crimson-dark">
                      Upgrade Now - $19/month
                    </SubscribeButton>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="text-center">
            <Link href="/membership-plans" className="text-crimson hover:text-crimson-light">
              View all plan options
            </Link>
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}
