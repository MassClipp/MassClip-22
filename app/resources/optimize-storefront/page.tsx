"use client"

import { motion } from "framer-motion"
import Link from "next/link"

export default function OptimizeStorefrontPage() {
  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-8"
        >
          <Link href="/" className="text-white/60 hover:text-white font-light">
            ← Back to Home
          </Link>

          <h1 className="text-5xl font-thin text-white">How to Optimize Your Storefront</h1>

          <div className="prose prose-invert max-w-none">
            <p className="text-xl text-white/70 font-light leading-relaxed">
              Maximize your sales potential by optimizing your MassClip storefront for better visibility and
              conversions.
            </p>

            <h2 className="text-3xl font-thin text-white mt-12">Profile Optimization</h2>
            <p className="text-white/70 font-light">
              Create a compelling bio that clearly explains what type of content you create and who it's for. Use
              relevant keywords to improve discoverability.
            </p>

            <h2 className="text-3xl font-thin text-white mt-12">Content Presentation</h2>
            <p className="text-white/70 font-light">
              Organize your content with clear titles, descriptions, and preview images. Make it easy for customers to
              understand what they're purchasing.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
