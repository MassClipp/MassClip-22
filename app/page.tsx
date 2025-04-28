"use client"

import { useRef } from "react"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Search, ArrowRight, Clock, TrendingUp, Download, Play } from "lucide-react"
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
    router.push("/dashboard")
  }

  const handleStartFree = () => {
    router.push("/signup")
  }

  const handleCategoryClick = (category: string) => {
    router.push(`/category/${encodeURIComponent(category)}`)
  }

  const scrollToContent = () => {
    const contentSection = document.getElementById("content-section")
    if (contentSection) {
      contentSection.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <div className="relative min-h-screen">
      {/* Background */}
      <div className="fixed inset-0 z-0 premium-gradient"></div>
      <div className="fixed inset-0 z-0 bg-[url('/noise.png')] opacity-[0.03]"></div>
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-transparent to-black/50"></div>

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
            <div className="flex flex-col items-center text-center mb-12">
              <motion.h1
                className="text-5xl md:text-7xl lg:text-8xl font-light text-white mb-6 max-w-4xl leading-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                The #1 Platform for <span className="text-gradient-accent">Faceless Creators</span>
              </motion.h1>

              <motion.p
                className="text-xl md:text-2xl font-light text-white/70 mb-12 max-w-2xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                Your time matters. Let&apos;s act like it.
              </motion.p>

              {/* Search Bar */}
              <motion.form
                onSubmit={handleSearch}
                className="w-full max-w-2xl mb-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-white/30" size={20} />
                  <input
                    type="text"
                    placeholder="Find your next viral post..."
                    className="w-full py-4 pl-14 pr-4 bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-crimson focus:ring-1 focus:ring-crimson transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </motion.form>

              {/* CTA Buttons */}
              <motion.div
                className="flex flex-col sm:flex-row gap-4 w-full max-w-md"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8 }}
              >
                <Button
                  onClick={handleExploreClips}
                  className="flex-1 py-6 bg-white/5 hover:bg-white/10 text-white text-lg border border-white/10 premium-button"
                >
                  EXPLORE CLIPS
                </Button>
                <Button
                  onClick={handleStartFree}
                  className="flex-1 py-6 bg-crimson hover:bg-crimson-dark text-white text-lg premium-button"
                >
                  START FREE
                </Button>
              </motion.div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <motion.div
            className="scroll-indicator cursor-pointer"
            onClick={scrollToContent}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.2 }}
          >
            <span className="text-xs uppercase tracking-widest text-white/50">Scroll</span>
            <div className="scroll-indicator-line"></div>
          </motion.div>
        </section>

        {/* Content Section */}
        <section id="content-section" className="py-20 md:py-32">
          <div className="container mx-auto max-w-6xl px-4">
            {/* Value Propositions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-32">
              <motion.div
                className="premium-card p-8"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <div className="mb-6 p-3 bg-white/5 inline-block rounded-sm">
                  <Clock className="h-6 w-6 text-crimson" />
                </div>
                <h3 className="text-2xl font-light text-white mb-4">Save Hours Daily</h3>
                <p className="text-white/70">
                  Reclaim your time with our platform. Access ready-made clips you can brand your way without the
                  endless search.
                </p>
              </motion.div>

              <motion.div
                className="premium-card p-8"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <div className="mb-6 p-3 bg-white/5 inline-block rounded-sm">
                  <TrendingUp className="h-6 w-6 text-crimson" />
                </div>
                <h3 className="text-2xl font-light text-white mb-4">Fresh Content Library</h3>
                <p className="text-white/70">
                  Our platform continuously updates with new content, ensuring you always have fresh clips to choose
                  from.
                </p>
              </motion.div>

              <motion.div
                className="premium-card p-8"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <div className="mb-6 p-3 bg-white/5 inline-block rounded-sm">
                  <Download className="h-6 w-6 text-crimson" />
                </div>
                <h3 className="text-2xl font-light text-white mb-4">Instant Downloads</h3>
                <p className="text-white/70">
                  Browse and download any clip you want with a single click. Less work, more content for your channels.
                </p>
              </motion.div>
            </div>

            {/* Categories Section */}
            <div className="mb-32">
              <motion.div
                className="text-center mb-16"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <h2 className="text-3xl md:text-4xl font-light text-white mb-4">ELITE CATEGORIES</h2>
                <p className="text-white/70 max-w-2xl mx-auto">
                  Curated collections of high-performing content across niches.
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Money & Wealth Category */}
                <motion.div
                  className="relative overflow-hidden group cursor-pointer bg-black/20 border border-white/5 aspect-video flex items-center justify-center"
                  onClick={() => handleCategoryClick("money-and-wealth")}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true, margin: "-100px" }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent opacity-70 group-hover:opacity-40 transition-opacity duration-300"></div>
                  <div className="relative z-10 text-center">
                    <h3 className="text-2xl font-light text-white mb-2 group-hover:text-crimson transition-colors duration-300">
                      Money & Wealth
                    </h3>
                    <div className="flex items-center justify-center text-white/50 text-sm">
                      <Play className="h-4 w-4 mr-2" />
                      <span>Explore Collection</span>
                    </div>
                  </div>
                </motion.div>

                {/* Hustle Mentality Category */}
                <motion.div
                  className="relative overflow-hidden group cursor-pointer bg-black/20 border border-white/5 aspect-video flex items-center justify-center"
                  onClick={() => handleCategoryClick("hustle-mentality")}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  viewport={{ once: true, margin: "-100px" }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent opacity-70 group-hover:opacity-40 transition-opacity duration-300"></div>
                  <div className="relative z-10 text-center">
                    <h3 className="text-2xl font-light text-white mb-2 group-hover:text-crimson transition-colors duration-300">
                      Hustle Mentality
                    </h3>
                    <div className="flex items-center justify-center text-white/50 text-sm">
                      <Play className="h-4 w-4 mr-2" />
                      <span>Explore Collection</span>
                    </div>
                  </div>
                </motion.div>

                {/* Introspection Category */}
                <motion.div
                  className="relative overflow-hidden group cursor-pointer bg-black/20 border border-white/5 aspect-video flex items-center justify-center"
                  onClick={() => handleCategoryClick("introspection")}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  viewport={{ once: true, margin: "-100px" }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent opacity-70 group-hover:opacity-40 transition-opacity duration-300"></div>
                  <div className="relative z-10 text-center">
                    <h3 className="text-2xl font-light text-white mb-2 group-hover:text-crimson transition-colors duration-300">
                      Introspection
                    </h3>
                    <div className="flex items-center justify-center text-white/50 text-sm">
                      <Play className="h-4 w-4 mr-2" />
                      <span>Explore Collection</span>
                    </div>
                  </div>
                </motion.div>
              </div>

              <motion.div
                className="text-center mt-12"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <Button
                  onClick={handleExploreClips}
                  className="bg-transparent hover:bg-white/5 text-white border border-white/10 px-8 py-6 premium-button"
                >
                  VIEW ALL CATEGORIES <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            </div>

            {/* Final CTA */}
            <motion.div
              className="text-center py-16 border-t border-b border-white/10"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <h2 className="text-3xl md:text-5xl font-light text-white mb-6">Ready to Accelerate Your Growth?</h2>
              <p className="text-white/70 text-xl mb-10 max-w-2xl mx-auto">
                Join the community of creators today who are building their pages and community with MassClip.
              </p>
              <Button
                onClick={handleStartFree}
                className="bg-crimson hover:bg-crimson-dark text-white text-lg px-12 py-6 premium-button"
              >
                START FREE TODAY
              </Button>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-12 border-t border-white/10">
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
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center">
            <p className="text-white/30 text-sm mb-4 md:mb-0">
              © {new Date().getFullYear()} MassClip. All rights reserved.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-white/30 hover:text-white transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
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
