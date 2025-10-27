"use client"

import { motion } from "framer-motion"

export function ObjectivesIndicator() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Outer glowing ring */}
      <motion.div
        className="absolute inset-0 rounded-lg border-2 border-teal-400/60"
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.6, 1, 0.6],
        }}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />

      {/* Middle pulse ring */}
      <motion.div
        className="absolute inset-0 rounded-lg border-2 border-cyan-400/40"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.4, 0.8, 0.4],
        }}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
          delay: 0.3,
        }}
      />

      {/* Expanding pulse effect */}
      <motion.div
        className="absolute inset-0 rounded-lg border border-teal-400/30"
        animate={{
          scale: [1, 1.15, 1.15],
          opacity: [0.5, 0, 0],
        }}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeOut",
        }}
      />

      {/* Inner glow */}
      <motion.div
        className="absolute inset-0 rounded-lg bg-gradient-to-r from-teal-400/10 to-cyan-400/10"
        animate={{
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />
    </div>
  )
}
