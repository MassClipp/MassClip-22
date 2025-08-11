"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { CheckCircle, ArrowRight } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { getSiteUrl } from "@/lib/url-utils"

export default function SubscriptionSuccess() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isVerifying, setIsVerifying] = useState(true)
  const [status, setStatus] = useState<"success" | "error" | "loading">("loading")
  const [message, setMessage] = useState("Verifying your subscription...")

  // Get the site URL safely
  const siteUrl = getSiteUrl()

  // Get the session ID from the URL
  const sessionId = searchParams?.get("session_id")

  // Verify the subscription when the component mounts
  useEffect(() => {
    // If no user, wait for auth to initialize
    if (!user) {
      return
    }

    // If no session ID, show error
    if (!sessionId) {
      setStatus("error")
      setMessage("No session ID found. Please contact support.")
      setIsVerifying(false)
      return
    }

    // Verify the subscription
    const verifySubscription = async () => {
      try {
        // Call an API to verify the subscription
        const response = await fetch(`/api/verify-subscription?sessionId=${sessionId}&userId=${user.uid}`)

        if (response.ok) {
          setStatus("success")
          setMessage("Your subscription has been activated successfully!")
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
  }, [user, sessionId])

  // If no user, redirect to login
  useEffect(() => {
    if (!user && !isVerifying) {
      router.push(`/login?redirect=/subscription/success${sessionId ? `?session_id=${sessionId}` : ""}`)
    }
  }, [user, router, isVerifying, sessionId])

  if (!user) {
    return null
  }

  return (
    <div className="relative min-h-screen bg-black text-white flex items-center justify-center">
      {/* Premium Gradient Background */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-black via-black to-gray-900"></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-md w-full p-8 bg-black/60 backdrop-blur-sm rounded-xl border border-gray-800 shadow-2xl text-center"
      >
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          className="flex justify-center"
        >
          <div className="rounded-full bg-green-900/20 p-3 mb-6">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-2xl font-bold text-white mb-4"
        >
          {status === "success"
            ? "Subscription Successful!"
            : status === "error"
              ? "Subscription Issue"
              : "Processing Subscription..."}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-gray-400 mb-6"
        >
          {message}
        </motion.p>

        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <Button
              className="w-full bg-red-600 hover:bg-red-700 text-white group flex items-center justify-center"
              onClick={() => router.push(`/dashboard`)}
              disabled={isVerifying}
            >
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
