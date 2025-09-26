"use client"

import { motion } from "framer-motion"
import Link from "next/link"

export default function FreeContentPage() {
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

          <h1 className="text-5xl font-thin text-white">How to Use Free Content</h1>

          <div className="prose prose-invert max-w-none">
            <p className="text-xl text-white/70 font-light leading-relaxed">
              Learn how to strategically use free content to grow your audience and drive sales on MassClip.
            </p>

            <h2 className="text-3xl font-thin text-white mt-12">Building Your Audience</h2>
            <p className="text-white/70 font-light">
              Free content serves as your marketing tool. By offering high-quality samples, you demonstrate your skills
              and build trust with potential customers.
            </p>

            <h2 className="text-3xl font-thin text-white mt-12">Content Strategy</h2>
            <p className="text-white/70 font-light">
              Follow the 80/20 rule: 80% free content to build audience, 20% premium content for revenue. This balance
              keeps your audience engaged while generating income.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
