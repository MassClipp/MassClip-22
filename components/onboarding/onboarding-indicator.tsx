"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface OnboardingIndicatorProps {
  active: boolean
  className?: string
}

export function OnboardingIndicator({ active, className }: OnboardingIndicatorProps) {
  if (!active) return null

  return (
    <motion.div
      className={cn("absolute inset-0 pointer-events-none rounded-lg", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Animated multi-color ring */}
      <motion.div
        className="absolute inset-0 rounded-lg"
        style={{
          background: "conic-gradient(from 0deg, #ff0080, #7928ca, #0070f3, #00dfd8, #ff0080)",
          padding: "3px",
        }}
        animate={{
          rotate: 360,
        }}
        transition={{
          duration: 3,
          repeat: Number.POSITIVE_INFINITY,
          ease: "linear",
        }}
      >
        <div className="w-full h-full bg-background rounded-lg" />
      </motion.div>

      {/* Pulsing glow effect */}
      <motion.div
        className="absolute inset-0 rounded-lg blur-md"
        style={{
          background: "conic-gradient(from 0deg, #ff0080, #7928ca, #0070f3, #00dfd8, #ff0080)",
        }}
        animate={{
          opacity: [0.3, 0.6, 0.3],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />
    </motion.div>
  )
}
