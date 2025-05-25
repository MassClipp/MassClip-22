"use client"

import { motion } from "framer-motion"

export default function VideoSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="rounded-lg overflow-hidden bg-gray-900/50 border border-gray-800"
    >
      <div className="aspect-video bg-gray-800/50 animate-pulse"></div>
      <div className="p-3 space-y-2">
        <div className="h-4 bg-gray-800/70 rounded animate-pulse"></div>
        <div className="h-3 bg-gray-800/50 rounded w-2/3 animate-pulse"></div>
        <div className="flex justify-between items-center pt-2">
          <div className="h-8 w-20 bg-gray-800/70 rounded animate-pulse"></div>
          <div className="h-6 w-6 bg-gray-800/70 rounded-full animate-pulse"></div>
        </div>
      </div>
    </motion.div>
  )
}
