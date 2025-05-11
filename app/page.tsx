"use client"

import type React from "react"

import { useRef, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Search, ArrowRight, Play, ChevronDown, Instagram } from "lucide-react"
import { Button } from "@/components/ui/button"
import ModernHeader from "@/components/modern-header"

export default function ModernLandingPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const heroRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  // Enhanced search functionality
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      localStorage.setItem("lastSearchQuery", searchQuery.trim())
      router.push(`/dashboard?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleExploreClips = () => {
    router.push("/dashboard")
  }

  const handleStartFree = () => {
    router.push("/signup")
  }

  const scrollToContent = () => {
    const contentSection = document.getElementById("features-section")
    if (contentSection) {
      contentSection.scrollIntoView({ behavior: "smooth" })
    }
  }

  useEffect(() => {
    setIsVisible(true)

    // Add noise texture
    const noiseOverlay = document.createElement("div")
    noiseOverlay.className = "noise-overlay"
    document.body.appendChild(noiseOverlay)

    return () => {
      if (noiseOverlay.parentNode) {
        noiseOverlay.parentNode.removeChild(noiseOverlay)
      }
    }
  }, [])

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    },
  }

  return (
    <div className="relative min-h-screen bg-gradient-dark">
      {/* Background Elements */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-zinc-900 to-black"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08)_0,rgba(0,0,0,0)_65%)]"></div>
      </div>

      {/* Header */}
      <ModernHeader />

      {/* Main Content */}
      <main className="relative z-10">
        {/* Hero Section */}
        <section
          ref={heroRef}
          className="relative min-h-screen flex flex-col justify-center items-center px-4 pt-20 pb-16"
        >
          <div className="container mx-auto max-w-6xl">
            <motion.div
              className="flex flex-col items-center text-center"
              variants={containerVariants}
              initial="hidden"
              animate={isVisible ? "visible" : "hidden"}
            >
              <motion.div variants={itemVariants} className="mb-4">
                <span className="inline-block py-1 px-3 rounded-full bg-inspire-500/10 text-inspire-400 text-xs font-medium tracking-wider uppercase mb-6">
                  The #1 Platform for Faceless Creators
                </span>
              </motion.div>

              <motion.h1
                variants={itemVariants}
                className="text-4xl md:text-7xl font-bold text-white mb-6 max-w-4xl leading-tight"
              >
                Elevate Your Content with <span className="text-gradient">Premium Clips</span>
              </motion.h1>

              <motion.p variants={itemVariants} className="text-lg md:text-xl text-zinc-400 mb-10 max-w-2xl">
                Access high-quality, ready-to-use motivational content that resonates with your audience and saves you
                hours of production time.
              </motion.p>

              {/* Search Bar */}
              <motion.form variants={itemVariants} onSubmit={handleSearch} className="w-full max-w-2xl mb-10">
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-zinc-500" size={20} />
                  <input
                    type="text"
                    placeholder="Try 'Codie Sanchez' or 'Damii motivation'..."
                    className="w-full py-4 pl-14 pr-4 bg-zinc-800/50 border border-zinc-700/30 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-inspire-500 focus:border-inspire-500 transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </motion.form>

              {/* CTA Buttons */}
              <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                <Button
                  onClick={handleExploreClips}
                  className="flex-1 py-6 bg-zinc-800 hover:bg-zinc-700 text-white text-lg rounded-lg hover-lift"
                >
                  Explore Clips
                </Button>
                <Button
                  onClick={handleStartFree}
                  className="flex-1 py-6 bg-inspire-600 hover:bg-inspire-700 text-white text-lg rounded-lg hover-lift"
                >
                  Start Free
                </Button>
              </motion.div>

              {/* Scroll Indicator */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5, duration: 0.5 }}
                className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex flex-col items-center cursor-pointer"
                onClick={scrollToContent}
              >
                <span className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Discover More</span>
                <ChevronDown className="text-zinc-500 animate-bounce" size={20} />
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features-section" className="py-20 md:py-32">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Creators Choose Us</h2>
              <p className="text-zinc-400 max-w-2xl mx-auto">
                Our platform is designed to help you create more content in less time, with professional quality that
                stands out.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
              <motion.div
                className="card-glass p-8 hover-lift"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <div className="w-12 h-12 rounded-lg bg-inspire-500/10 flex items-center justify-center mb-6">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-inspire-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Save Hours Daily</h3>
                <p className="text-zinc-400">
                  Stop wasting time searching for content. Our curated library gives you instant access to high-quality
                  clips.
                </p>
              </motion.div>

              <motion.div
                className="card-glass p-8 hover-lift"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <div className="w-12 h-12 rounded-lg bg-energy-500/10 flex items-center justify-center mb-6">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-energy-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Premium Quality</h3>
                <p className="text-zinc-400">
                  Every clip is professionally edited and optimized for social media to help you stand out from the
                  crowd.
                </p>
              </motion.div>

              <motion.div
                className="card-glass p-8 hover-lift"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <div className="w-12 h-12 rounded-lg bg-success-500/10 flex items-center justify-center mb-6">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-success-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Instant Downloads</h3>
                <p className="text-zinc-400">
                  Find what you need and download with a single click. No complicated processes or waiting times.
                </p>
              </motion.div>
            </div>

            {/* Categories Section */}
            <div className="mb-32">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Explore Categories</h2>
                <p className="text-zinc-400 max-w-2xl mx-auto">
                  Browse our extensive collection of motivational content across different niches.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Money & Wealth Category */}
                <motion.div
                  className="relative overflow-hidden rounded-xl aspect-video group cursor-pointer"
                  onClick={() => router.push("/category/money-and-wealth")}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true, margin: "-100px" }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-amber-900/40 group-hover:opacity-70 transition-opacity duration-300"></div>
                  <div className="absolute inset-0 bg-zinc-900/50"></div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-amber-300 transition-colors duration-300">
                      Money & Wealth
                    </h3>
                    <div className="flex items-center justify-center text-white/70 text-sm">
                      <Play className="h-4 w-4 mr-2" />
                      <span>Explore Collection</span>
                    </div>
                  </div>
                </motion.div>

                {/* Hustle Mentality Category */}
                <motion.div
                  className="relative overflow-hidden rounded-xl aspect-video group cursor-pointer"
                  onClick={() => router.push("/category/hustle-mentality")}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  viewport={{ once: true, margin: "-100px" }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-energy-500/20 to-energy-900/40 group-hover:opacity-70 transition-opacity duration-300"></div>
                  <div className="absolute inset-0 bg-zinc-900/50"></div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-energy-300 transition-colors duration-300">
                      Hustle Mentality
                    </h3>
                    <div className="flex items-center justify-center text-white/70 text-sm">
                      <Play className="h-4 w-4 mr-2" />
                      <span>Explore Collection</span>
                    </div>
                  </div>
                </motion.div>

                {/* Introspection Category */}
                <motion.div
                  className="relative overflow-hidden rounded-xl aspect-video group cursor-pointer"
                  onClick={() => router.push("/category/introspection")}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  viewport={{ once: true, margin: "-100px" }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-inspire-500/20 to-inspire-900/40 group-hover:opacity-70 transition-opacity duration-300"></div>
                  <div className="absolute inset-0 bg-zinc-900/50"></div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-inspire-300 transition-colors duration-300">
                      Introspection
                    </h3>
                    <div className="flex items-center justify-center text-white/70 text-sm">
                      <Play className="h-4 w-4 mr-2" />
                      <span>Explore Collection</span>
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="text-center mt-12">
                <Button
                  onClick={handleExploreClips}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white px-8 py-3 rounded-lg hover-lift inline-flex items-center"
                >
                  View All Categories <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Testimonial Section */}
            <div className="mb-32">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">What Creators Say</h2>
                <p className="text-zinc-400 max-w-2xl mx-auto">
                  Join thousands of content creators who are growing their audience with our platform.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <motion.div
                  className="card-glass p-8 relative"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true, margin: "-100px" }}
                >
                  <div className="absolute top-6 left-6 text-6xl text-inspire-500/20 font-serif">"</div>
                  <div className="relative z-10">
                    <p className="text-zinc-300 mb-6 italic">
                      "MassClip has completely transformed my content creation process. I'm able to post consistently
                      without spending hours searching for clips." I'm able to post consistently without spending hours
                      searching for clips."
                    </p>
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center mr-3">
                        <span className="text-inspire-400 font-medium">JD</span>
                      </div>
                      <div>
                        <p className="text-white font-medium">John Doe</p>
                        <p className="text-zinc-500 text-sm">Fitness Creator</p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className="card-glass p-8 relative"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  viewport={{ once: true, margin: "-100px" }}
                >
                  <div className="absolute top-6 left-6 text-6xl text-energy-500/20 font-serif">"</div>
                  <div className="relative z-10">
                    <p className="text-zinc-300 mb-6 italic">
                      "The quality of content on MassClip is unmatched. My engagement has increased by 300% since I
                      started using clips from their platform."
                    </p>
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center mr-3">
                        <span className="text-energy-400 font-medium">JS</span>
                      </div>
                      <div>
                        <p className="text-white font-medium">Jane Smith</p>
                        <p className="text-zinc-500 text-sm">Motivational Coach</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Final CTA */}
            <motion.div
              className="rounded-2xl bg-gradient-to-r from-zinc-900 to-zinc-800 p-12 text-center border border-zinc-700/20"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Elevate Your Content?</h2>
              <p className="text-zinc-400 text-lg mb-8 max-w-2xl mx-auto">
                Join thousands of creators who are saving time and growing their audience with premium motivational
                content.
              </p>
              <Button
                onClick={handleStartFree}
                className="bg-inspire-600 hover:bg-inspire-700 text-white text-lg px-8 py-4 rounded-lg hover-lift"
              >
                Start Free Today
              </Button>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-12 border-t border-zinc-800/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <Link href="/" className="text-xl font-bold tracking-tight">
                <span className="text-inspire-500">MASS</span>
                <span className="text-white">CLIP</span>
              </Link>
            </div>

            <div className="flex flex-wrap justify-center gap-8 text-sm text-zinc-500">
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy
              </Link>
              <a href="mailto:john@massclip.pro" className="hover:text-white transition-colors">
                john@massclip.pro
              </a>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-zinc-800/50 flex flex-col md:flex-row justify-between items-center">
            <p className="text-zinc-500 text-sm mb-4 md:mb-0">
              © {new Date().getFullYear()} MassClip. All rights reserved.
            </p>
            <div className="flex gap-4">
              <a
                href="https://www.instagram.com/massclipp?igsh=MTZtY2w0bnQwaHI1OA%3D%3D&utm_source=qr"
                className="text-zinc-500 hover:text-white transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Instagram size={20} />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
