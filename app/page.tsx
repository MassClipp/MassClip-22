"use client"

import { useRef } from "react"
import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Upload, Share2, DollarSign, StoreIcon as Storefront, Download, EyeOff } from "lucide-react"
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

  const handleStartSelling = () => {
    router.push("/dashboard/earnings")
  }

  const handleExploreFreeClips = () => {
    router.push("/dashboard/explore")
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
                className="text-4xl md:text-7xl lg:text-8xl font-light text-white mb-6 max-w-5xl leading-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                Create. Sell. <span className="text-gradient-accent">Monetize.</span>
              </motion.h1>

              <motion.p
                className="text-lg md:text-2xl font-light text-white/70 mb-8 md:mb-12 max-w-3xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                We take selling content serious. You should too.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                className="flex flex-col sm:flex-row gap-4 w-full max-w-lg mb-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                <Button
                  onClick={handleStartSelling}
                  className="flex-1 py-3 sm:py-6 bg-crimson hover:bg-crimson-dark text-white text-sm sm:text-lg premium-button"
                >
                  START SELLING
                </Button>
                <Button
                  onClick={handleExploreFreeClips}
                  className="flex-1 py-3 sm:py-6 bg-white/5 hover:bg-white/10 text-white text-sm sm:text-lg border border-white/10 premium-button"
                >
                  EXPLORE FREE CLIPS
                </Button>
              </motion.div>

              {/* Benefits Icons */}
              <motion.div
                className="flex flex-wrap justify-center gap-8 text-white/60 text-xs uppercase tracking-widest"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8 }}
              >
                <div className="flex items-center gap-2">
                  <EyeOff className="h-4 w-4" />
                  <span>Effortless Discoverability</span>
                </div>
                <div className="flex items-center gap-2">
                  <Storefront className="h-4 w-4" />
                  <span>Built-in Storefront</span>
                </div>
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  <span>Direct Downloads</span>
                </div>
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
            <span className="text-xs uppercase tracking-widest text-white/50">How it works</span>
            <div className="scroll-indicator-line"></div>
          </motion.div>
        </section>

        {/* How It Works Section */}
        <section id="content-section" className="py-20 md:py-32">
          <div className="container mx-auto max-w-6xl px-4">
            {/* How It Works */}
            <div className="mb-32">
              <motion.div
                className="text-center mb-16"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <h2 className="text-3xl md:text-4xl font-light text-white mb-4">Three Steps to Digital Income</h2>
                <p className="text-white/70 max-w-2xl mx-auto">
                  Build your anonymous creator business in minutes, not months.
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                <motion.div
                  className="premium-card p-8 text-center"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true, margin: "-100px" }}
                >
                  <div className="mb-6 p-4 bg-crimson/10 inline-block rounded-full">
                    <Upload className="h-8 w-8 text-crimson" />
                  </div>
                  <h3 className="text-xl font-light text-white mb-4">1. Upload Your Content</h3>
                  <p className="text-white/70 text-sm">
                    Upload free clips to build your audience, or premium content to start earning immediately. No face
                    required.
                  </p>
                </motion.div>

                <motion.div
                  className="premium-card p-8 text-center"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  viewport={{ once: true, margin: "-100px" }}
                >
                  <div className="mb-6 p-4 bg-crimson/10 inline-block rounded-full">
                    <Share2 className="h-8 w-8 text-crimson" />
                  </div>
                  <h3 className="text-xl font-light text-white mb-4">2. Share Your Store Link</h3>
                  <p className="text-white/70 text-sm">
                    Get your personalized storefront link. Share it anywhere — bio links, Discord, Twitter, wherever
                    your audience is.
                  </p>
                </motion.div>

                <motion.div
                  className="premium-card p-8 text-center"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  viewport={{ once: true, margin: "-100px" }}
                >
                  <div className="mb-6 p-4 bg-crimson/10 inline-block rounded-full">
                    <DollarSign className="h-8 w-8 text-crimson" />
                  </div>
                  <h3 className="text-xl font-light text-white mb-4">3. Create Content Bundles</h3>
                  <p className="text-white/70 text-sm">
                    Package your best content into bundles and sell them to your audience who already enjoy your
                    content. Turn your existing fans into paying customers.
                  </p>
                </motion.div>
              </div>
            </div>
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
                    d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-.748-1.15-.137-.353-.3-.882-.344-1.857-.048-1.023-.058-1.351-.058-3.807v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 4.041v.08c0 2.597-.01 2.917-.058 3.96-.045.976-.207 1.505-.344 1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
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
