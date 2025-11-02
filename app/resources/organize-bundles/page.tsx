"use client"

import { motion } from "framer-motion"
import Link from "next/link"

export default function OrganizeBundlesPage() {
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

          <h1 className="text-5xl font-thin text-white">How to Organize Your Bundles</h1>

          <div className="prose prose-invert max-w-none">
            <p className="text-xl text-white/70 font-light leading-relaxed">
              Learn effective strategies for bundling your content to increase sales and provide more value to
              customers.
            </p>

            <h2 className="text-3xl font-thin text-white mt-12">Bundle Strategy</h2>
            <p className="text-white/70 font-light">
              Group related content together to create more value. For example, combine B-roll footage with matching
              audio tracks or create themed content packages.
            </p>

            <h2 className="text-3xl font-thin text-white mt-12">Pricing Bundles</h2>
            <p className="text-white/70 font-light">
              Price bundles at a discount compared to individual items to encourage larger purchases. Typically, offer
              20-30% savings on bundle purchases.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
