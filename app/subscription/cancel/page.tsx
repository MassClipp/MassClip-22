"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { XCircle, ArrowRight } from "lucide-react"

export default function SubscriptionCancelled() {
  const router = useRouter()

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
          <div className="rounded-full bg-red-900/20 p-3 mb-6">
            <XCircle className="h-12 w-12 text-red-500" />
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-2xl font-bold text-white mb-4"
        >
          Subscription Cancelled
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-gray-400 mb-6"
        >
          Your subscription process was cancelled. If you encountered any issues or have questions, please don't
          hesitate to contact us.
        </motion.p>

        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <Button
              className="w-full bg-red-600 hover:bg-red-700 text-white group flex items-center justify-center"
              onClick={() => router.push("/membership-plans")}
            >
              Try Again
              <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            <Link href="/dashboard">
              <Button variant="outline" className="w-full border-gray-700 text-gray-300 hover:bg-gray-800">
                Return to Dashboard
              </Button>
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
