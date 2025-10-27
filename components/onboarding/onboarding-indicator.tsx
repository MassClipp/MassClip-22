"use client"

import type React from "react"

import { motion } from "framer-motion"

interface OnboardingIndicatorProps {
  children: React.ReactNode
  isActive: boolean
}

export function OnboardingIndicator({ children, isActive }: OnboardingIndicatorProps) {
  if (!isActive) {
    return <>{children}</>
  }

  return (
    <div className="relative">
      {/* Animated multi-color ring */}
      <motion.div
        className="absolute inset-0 rounded-lg"
        style={{
          background: "conic-gradient(from 0deg, #ff0080, #7928ca, #ff0080)",
          padding: "2px",
          zIndex: -1,
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
          background: "radial-gradient(circle, rgba(255,0,128,0.4), rgba(121,40,202,0.4))",
          zIndex: -2,
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />

      {children}
    </div>
  )
}
