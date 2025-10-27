"use client"

import { motion } from "framer-motion"

export function ObjectivesIndicator() {
  return (
    <motion.div
      className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-gradient-to-r from-teal-400 to-cyan-400 shadow-lg"
      animate={{
        scale: [1, 1.3, 1],
        opacity: [1, 0.7, 1],
      }}
      transition={{
        duration: 2,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut",
      }}
    >
      {/* Outer pulse ring */}
      <motion.div
        className="absolute inset-0 rounded-full bg-teal-400/50"
        animate={{
          scale: [1, 2, 2],
          opacity: [0.5, 0, 0],
        }}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeOut",
        }}
      />
    </motion.div>
  )
}
