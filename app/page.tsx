"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Search, CheckCircle2 } from "lucide-react"
import LandingHeader from "@/components/landing-header"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/dashboard?search=${encodeURIComponent(searchQuery)}`)
    }
  }

  const handleExploreClips = () => {
    router.push("/dashboard")
  }

  const handleStartFree = () => {
    router.push("/signup")
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Static Gradient Background */}
      <div className="fixed inset-0 z-0 static-gradient-bg"></div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <LandingHeader />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col">
          {/* Hero Section */}
          <section className="container mx-auto px-4 py-16 md:py-24 flex flex-col items-center">
            <h1 className="text-4xl md:text-6xl font-bold text-center text-white mb-8 max-w-4xl">
              The #1 Marketplace for Viral Clips
            </h1>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="w-full max-w-2xl mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Find your next viral post..."
                  className="w-full py-3 pl-12 pr-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-crimson"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </form>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
              <Button
                onClick={handleExploreClips}
                className="flex-1 py-6 bg-gray-900 hover:bg-gray-800 text-white text-lg rounded-md"
              >
                Explore Clips
              </Button>
              <Button
                onClick={handleStartFree}
                className="flex-1 py-6 bg-crimson hover:bg-crimson-dark text-white text-lg rounded-md"
              >
                Start Free
              </Button>
            </div>
          </section>

          {/* How It Works Section */}
          <section className="container mx-auto px-4 py-12 md:py-16">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-12">How It Works</h2>
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="flex items-start gap-4">
                <CheckCircle2 className="text-crimson flex-shrink-0 mt-1" size={24} />
                <p className="text-xl text-white">Browse trending and niche-specific clips</p>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle2 className="text-crimson flex-shrink-0 mt-1" size={24} />
                <p className="text-xl text-white">Download and post to your brand/page</p>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle2 className="text-crimson flex-shrink-0 mt-1" size={24} />
                <p className="text-xl text-white">Upgrade for unlimited access and exclusive features</p>
              </div>
            </div>

            {/* Social Proof */}
            <div className="max-w-2xl mx-auto mt-16 text-center">
              <p className="text-xl md:text-2xl text-white/80">
                Over 500+ creators built their pages faster with MassClip.
              </p>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="relative z-10 border-t border-white/10 py-6">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-center md:justify-start items-center gap-6 text-white/70">
              <Link href="/about" className="hover:text-white transition-colors">
                About
              </Link>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms & Conditions
              </Link>
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/contact" className="hover:text-white transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
