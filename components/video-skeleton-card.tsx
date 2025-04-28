"use client"

import { motion } from "framer-motion"

export default function VideoSkeletonCard() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="rounded-lg overflow-hidden bg-gray-900/30 border border-gray-800/50"
    >
      <div className="aspect-video bg-gray-800/30 relative overflow-hidden">
        <div className="absolute inset-0 shimmer"></div>
      </div>
      <div className="p-3 space-y-2">
        <div className="h-4 bg-gray-800/30 rounded relative overflow-hidden">
          <div className="absolute inset-0 shimmer"></div>
        </div>
        <div className="h-3 bg-gray-800/30 rounded w-2/3 relative overflow-hidden">
          <div className="absolute inset-0 shimmer"></div>
        </div>
      </div>
    </motion.div>
  )
}
