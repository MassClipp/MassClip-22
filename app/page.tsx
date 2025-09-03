"use client"

import { useRef } from "react"
import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Upload, DollarSign, StoreIcon as Storefront, EyeOff, Shield, TrendingUp } from "lucide-react"
import LandingHeader from "@/components/landing-header"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const heroRef = useRef<HTMLDivElement>(null)

  // Enhanced search functionality
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      localStorage.setItem("lastSearchQuery", searchQuery.trim())
      router.push(`/dashboard?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleExploreClips = () => {
    router.push("/dashboard/explore")
  }

  const handleHowItWorks = () => {
    const contentSection = document.getElementById("content-section")
    if (contentSection) {
      contentSection.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        {/* Animated abstract shapes */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-gray-800/30 to-gray-900/20 rounded-full blur-3xl"
            animate={{
              x: [0, 100, 0],
              y: [0, -50, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 20,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute top-3/4 right-1/4 w-80 h-80 bg-gradient-to-br from-gray-700/20 to-gray-800/30 rounded-full blur-3xl"
            animate={{
              x: [0, -80, 0],
              y: [0, 60, 0],
              scale: [1, 0.9, 1],
            }}
            transition={{
              duration: 25,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute top-1/2 right-1/3 w-64 h-64 bg-gradient-to-br from-red-900/10 to-gray-800/20 rounded-full blur-2xl"
            animate={{
              x: [0, 60, 0],
              y: [0, -40, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 30,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          />
        </div>
        {/* Subtle noise texture */}
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02]"></div>
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80"></div>
      </div>

      {/* Header */}
      <LandingHeader />

      {/* Main Content */}
      <main className="relative z-10">
        {/* Hero Section */}
        <section
          ref={heroRef}
          className="relative min-h-screen flex flex-col justify-center items-center px-4 pt-20 pb-16"
        >
          <div className="container mx-auto max-w-6xl">
            <div className="flex flex-col items-center text-center">
              <motion.div
                className="mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
              >
                <span className="inline-flex items-center px-4 py-2 rounded-full bg-red-600/10 border border-red-600/20 text-red-400 text-sm font-medium tracking-wide">
                  ✨ New Faceless Creator Platform
                </span>
              </motion.div>

              <motion.h1
                className="text-5xl md:text-7xl lg:text-8xl font-light text-white mb-8 max-w-6xl leading-[0.9] tracking-tight"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.2 }}
              >
                Beautiful <span className="italic font-light">Clip</span>
                <br />
                <span className="text-red-600">Experiences</span>
              </motion.h1>

              <motion.p
                className="text-xl md:text-2xl font-light text-gray-300 mb-12 max-w-4xl leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                The first platform designed for faceless creator monetization. Build your anonymous content empire with
                premium tools that respect your privacy.
              </motion.p>

              <motion.div
                className="flex flex-col sm:flex-row gap-6 mb-16"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                <Button
                  onClick={handleExploreClips}
                  className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white text-lg font-medium rounded-full transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-red-600/25"
                >
                  Explore Clips
                </Button>
                <Button
                  onClick={handleHowItWorks}
                  className="px-8 py-4 bg-transparent hover:bg-red-600/10 text-red-400 text-lg font-medium rounded-full border-2 border-red-600 hover:border-red-500 transition-all duration-300"
                >
                  How It Works
                </Button>
              </motion.div>

              <motion.div
                className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl text-gray-400"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8 }}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 rounded-full bg-gray-800/50">
                    <EyeOff className="h-6 w-6 text-red-400" />
                  </div>
                  <span className="text-sm font-medium">Anonymous Monetization</span>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 rounded-full bg-gray-800/50">
                    <Shield className="h-6 w-6 text-red-400" />
                  </div>
                  <span className="text-sm font-medium">Privacy-First Platform</span>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 rounded-full bg-gray-800/50">
                    <TrendingUp className="h-6 w-6 text-red-400" />
                  </div>
                  <span className="text-sm font-medium">Instant Revenue Streams</span>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="content-section" className="py-20 md:py-32 relative">
          <div className="container mx-auto max-w-6xl px-4">
            <motion.div
              className="text-center mb-20"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <h2 className="text-4xl md:text-5xl font-light text-white mb-6">
                Faceless Creator <span className="text-red-600">Monetization</span>
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                Turn your anonymous content into sustainable income streams without revealing your identity.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
              <motion.div
                className="group p-8 rounded-2xl bg-gradient-to-br from-gray-900/50 to-gray-800/30 border border-gray-800/50 hover:border-red-600/30 transition-all duration-500"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <div className="mb-6 p-4 bg-red-600/10 inline-block rounded-xl group-hover:bg-red-600/20 transition-colors">
                  <Upload className="h-8 w-8 text-red-400" />
                </div>
                <h3 className="text-2xl font-light text-white mb-4">Anonymous Upload</h3>
                <p className="text-gray-400 leading-relaxed">
                  Upload your content completely anonymously. No face reveals, no personal information required. Build
                  your faceless creator brand with confidence.
                </p>
              </motion.div>

              <motion.div
                className="group p-8 rounded-2xl bg-gradient-to-br from-gray-900/50 to-gray-800/30 border border-gray-800/50 hover:border-red-600/30 transition-all duration-500"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <div className="mb-6 p-4 bg-red-600/10 inline-block rounded-xl group-hover:bg-red-600/20 transition-colors">
                  <Storefront className="h-8 w-8 text-red-400" />
                </div>
                <h3 className="text-2xl font-light text-white mb-4">Instant Storefront</h3>
                <p className="text-gray-400 leading-relaxed">
                  Get your personalized anonymous storefront instantly. Share your link anywhere your audience gathers -
                  Discord, Twitter, Reddit, or any platform.
                </p>
              </motion.div>

              <motion.div
                className="group p-8 rounded-2xl bg-gradient-to-br from-gray-900/50 to-gray-800/30 border border-gray-800/50 hover:border-red-600/30 transition-all duration-500"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <div className="mb-6 p-4 bg-red-600/10 inline-block rounded-xl group-hover:bg-red-600/20 transition-colors">
                  <DollarSign className="h-8 w-8 text-red-400" />
                </div>
                <h3 className="text-2xl font-light text-white mb-4">Monetize Everything</h3>
                <p className="text-gray-400 leading-relaxed">
                  Bundle your best content, create premium tiers, and turn your existing audience into paying customers.
                  All while staying completely anonymous.
                </p>
              </motion.div>
            </div>

            <motion.div
              className="text-center py-16 px-8 rounded-3xl bg-gradient-to-br from-red-600/5 to-gray-900/30 border border-red-600/10"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <h3 className="text-3xl md:text-4xl font-light text-white mb-6">Why Faceless Creators Choose MassClip</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-gray-300">Complete privacy protection - no personal data required</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-gray-300">Built-in audience discovery without showing your face</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-gray-300">Anonymous payment processing and withdrawals</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-gray-300">Premium content bundling and pricing tools</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-gray-300">Direct fan-to-creator monetization channels</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-gray-300">Analytics dashboard to track anonymous performance</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-16 border-t border-gray-800/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <Link href="/" className="text-xl font-medium tracking-tighter">
                <span className="text-crimson">MASS</span>
                <span className="text-white">CLIP</span>
              </Link>
            </div>

            <div className="flex flex-wrap justify-center gap-8 text-sm text-white/50">
              <Link href="/terms" className="hover:text-white transition-colors">
                TERMS
              </Link>
              <Link href="/privacy" className="hover:text-white transition-colors">
                PRIVACY
              </Link>
              <a href="mailto:john@massclip.pro" className="hover:text-white transition-colors">
                john@massclip.pro
              </a>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center">
            <p className="text-white/30 text-sm mb-4 md:mb-0">
              © {new Date().getFullYear()} MassClip. All rights reserved.
            </p>
            <div className="flex gap-4">
              <a
                href="https://www.instagram.com/massclip.official"
                className="text-white/30 hover:text-white transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-.1857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
