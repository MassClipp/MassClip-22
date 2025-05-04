"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { CheckCircle, ArrowRight } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

export default function SubscriptionSuccess() {
  const { user } = useAuth()
  const router = useRouter()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin

  // If no user, redirect to login
  useEffect(() => {
    if (!user) {
      router.push(`${siteUrl}/login`)
    }
  }, [user, router, siteUrl])

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
          Subscription Successful!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-gray-400 mb-6"
        >
          Thank you for subscribing to MassClip Creator Pro! Your account has been upgraded and you now have access to
          all premium features.
        </motion.p>

        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <Button
              className="w-full bg-red-600 hover:bg-red-700 text-white group flex items-center justify-center"
              onClick={() => router.push(`${siteUrl}/dashboard`)}
            >
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            <Link href={`${siteUrl}/dashboard/user`}>
              <Button variant="outline" className="w-full border-gray-700 text-gray-300 hover:bg-gray-800">
                View Account
              </Button>
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
