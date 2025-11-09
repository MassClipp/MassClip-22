"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { CheckCircle, ArrowRight, Sparkles, Crown, Zap, Shield, Folder, Package } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { getSiteUrl } from "@/lib/url-utils"
import { useUserPlan } from "@/hooks/use-user-plan"

type PlanType = "starter" | "creator_vip" | "facelessprenuer" | "faceless_pro" | "unknown"

export default function SubscriptionSuccess() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isVerifying, setIsVerifying] = useState(true)
  const [status, setStatus] = useState<"success" | "error" | "loading">("loading")
  const [message, setMessage] = useState("Verifying your subscription...")
  const [planType, setPlanType] = useState<PlanType>("unknown")

  const { refetchPlan } = useUserPlan()

  const siteUrl = getSiteUrl()

  const sessionId = searchParams?.get("session_id")

  useEffect(() => {
    if (!user) {
      return
    }

    if (!sessionId) {
      setStatus("error")
      setMessage("No session ID found. Please contact support.")
      setIsVerifying(false)
      return
    }

    const verifySubscription = async () => {
      try {
        const token = await user.getIdToken()

        const response = await fetch(`/api/verify-subscription?sessionId=${sessionId}&userId=${user.uid}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()

          const plan = data.plan || "creator_vip"
          setPlanType(plan)

          setStatus("success")
          setMessage("Your subscription has been activated successfully!")

          console.log("[v0] Subscription success - refetching membership data")
          await refetchPlan()

          if (typeof window !== "undefined" && (window as any).fbq) {
            ;(window as any).fbq("track", "Purchase", {
              value: plan === "starter" ? 3.0 : plan === "faceless_pro" ? 29.0 : 39.0,
              currency: "USD",
              content_name:
                plan === "starter"
                  ? "Starter Plan Subscription"
                  : plan === "faceless_pro"
                    ? "Faceless Pro Subscription"
                    : plan === "facelessprenuer"
                      ? "Facelessprenuer Subscription"
                      : "Creator VIP Subscription",
              content_type: "subscription",
            })
          }
        } else {
          setStatus("error")
          setMessage("There was an issue verifying your subscription. Please contact support.")
        }
      } catch (error) {
        console.error("Error verifying subscription:", error)
        setStatus("error")
        setMessage("An error occurred while verifying your subscription. Please contact support.")
      } finally {
        setIsVerifying(false)
      }
    }

    verifySubscription()
  }, [user, sessionId, refetchPlan])

  useEffect(() => {
    if (!user && !isVerifying) {
      router.push(`/login?redirect=/subscription/success${sessionId ? `?session_id=${sessionId}` : ""}`)
    }
  }, [user, router, isVerifying, sessionId])

  if (!user) {
    return null
  }

  const planContent = {
    starter: {
      title: "Welcome to Starter Plan!",
      description: "Your subscription is now active. Start building your content library!",
      features: [
        {
          icon: Folder,
          title: "3 Folders",
          description: "Organize your content",
          color: "emerald",
        },
        {
          icon: Package,
          title: "5 Bundles",
          description: "Create and sell bundles",
          color: "cyan",
        },
        {
          icon: Shield,
          title: "20% Platform Fee",
          description: "Standard creator rate",
          color: "purple",
        },
      ],
    },
    faceless_pro: {
      title: "Welcome to Faceless Pro!",
      description: "Your subscription is now active. Start creating and selling premium content!",
      features: [
        {
          icon: Package,
          title: "15 Videos Per Bundle",
          description: "Create video bundles",
          color: "emerald",
        },
        {
          icon: Folder,
          title: "5 Bundles",
          description: "Bundle content options",
          color: "cyan",
        },
        {
          icon: Shield,
          title: "20% Platform Fee",
          description: "Standard creator rate",
          color: "purple",
        },
      ],
    },
    facelessprenuer: {
      title: "Welcome to Facelessprenuer!",
      description: "Your subscription is now active. Get ready to unlock unlimited creative potential!",
      features: [
        {
          icon: Crown,
          title: "Unlimited Access",
          description: "All premium features unlocked",
          color: "emerald",
        },
        {
          icon: Zap,
          title: "10% Platform Fee",
          description: "Keep more of your earnings",
          color: "cyan",
        },
        {
          icon: Sparkles,
          title: "Full Vex AI",
          description: "AI-powered bundle creation",
          color: "purple",
        },
      ],
    },
    creator_vip: {
      title: "Welcome to Creator VIP!",
      description: "Your subscription is now active. Get ready to unlock unlimited creative potential!",
      features: [
        {
          icon: Crown,
          title: "Unlimited Access",
          description: "All premium features unlocked",
          color: "emerald",
        },
        {
          icon: Zap,
          title: "10% Platform Fee",
          description: "Keep more of your earnings",
          color: "cyan",
        },
        {
          icon: Sparkles,
          title: "Full Vex AI",
          description: "AI-powered bundle creation",
          color: "purple",
        },
      ],
    },
  }

  const content =
    planType === "starter"
      ? planContent.starter
      : planType === "faceless_pro"
        ? planContent.faceless_pro
        : planType === "facelessprenuer"
          ? planContent.facelessprenuer
          : planContent.creator_vip

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white flex items-center justify-center overflow-hidden">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative z-10 max-w-2xl w-full mx-4"
      >
        <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 backdrop-blur-xl rounded-2xl border border-zinc-800/50 shadow-2xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500"></div>

          <div className="p-8 md:p-12 text-center">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
              className="flex justify-center mb-6"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500/30 rounded-full blur-2xl animate-pulse"></div>
                <div className="relative rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 p-4 border border-emerald-500/30">
                  <CheckCircle className="h-16 w-16 text-emerald-400" strokeWidth={1.5} />
                </div>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-white via-emerald-100 to-cyan-100 bg-clip-text text-transparent"
            >
              {status === "success" ? content.title : status === "error" ? "Subscription Issue" : "Processing..."}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="text-zinc-300 text-lg mb-8 leading-relaxed"
            >
              {status === "success" ? content.description : message}
            </motion.p>

            {status === "success" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
              >
                {content.features.map((feature, index) => {
                  const Icon = feature.icon
                  const colorClasses = {
                    emerald: "bg-emerald-500/10 text-emerald-400",
                    cyan: "bg-cyan-500/10 text-cyan-400",
                    purple: "bg-purple-500/10 text-purple-400",
                  }
                  return (
                    <div
                      key={index}
                      className="bg-zinc-800/40 backdrop-blur-sm rounded-xl p-4 border border-zinc-700/50"
                    >
                      <div className="flex justify-center mb-2">
                        <div className={`p-2 rounded-lg ${colorClasses[feature.color as keyof typeof colorClasses]}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                      </div>
                      <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
                      <p className="text-sm text-zinc-400">{feature.description}</p>
                    </div>
                  )
                })}
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <Button
                className="w-full md:w-auto px-8 py-6 text-lg font-semibold bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-lg shadow-emerald-500/25 transition-all duration-300 group"
                onClick={() => router.push(`/dashboard`)}
                disabled={isVerifying}
              >
                {status === "success" ? "Go to Dashboard" : "Continue"}
                <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </motion.div>

            {status === "error" && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="mt-6 text-sm text-zinc-400"
              >
                Need help?{" "}
                <a href="/support" className="text-emerald-400 hover:text-emerald-300 underline">
                  Contact Support
                </a>
              </motion.p>
            )}
          </div>
        </div>

        {status === "success" && (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1, 1.5], y: -100 }}
              transition={{ delay: 0.8, duration: 2, ease: "easeOut" }}
              className="absolute top-1/4 left-1/4 w-2 h-2 bg-emerald-400 rounded-full"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1, 1.5], y: -100 }}
              transition={{ delay: 1, duration: 2, ease: "easeOut" }}
              className="absolute top-1/3 right-1/3 w-2 h-2 bg-cyan-400 rounded-full"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1, 1.5], y: -100 }}
              transition={{ delay: 1.2, duration: 2, ease: "easeOut" }}
              className="absolute top-1/2 left-1/3 w-2 h-2 bg-purple-400 rounded-full"
            />
          </>
        )}
      </motion.div>
    </div>
  )
}
