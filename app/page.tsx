"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  const router = useRouter()

  const handleGetStarted = () => {
    router.push("/signup")
  }

  const handleExplore = () => {
    router.push("/explore")
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="relative z-10 px-6 py-6">
        <nav className="flex items-center justify-between max-w-7xl mx-auto">
          <div></div>

          {/* Center Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/pricing" className="text-white/80 hover:text-white transition-colors font-light">
              Pricing
            </Link>
            <Link href="/explore" className="text-white/80 hover:text-white transition-colors font-light">
              Explore
            </Link>
          </div>

          {/* Login */}
          <Link href="/login" className="text-white/80 hover:text-white transition-colors font-light">
            Login
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex items-end justify-start min-h-[calc(100vh-120px)] px-6 pb-16">
        <div className="max-w-7xl mx-auto w-full">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-6"
            >
              <h1 className="text-5xl lg:text-7xl font-thin text-white leading-tight">
                Monetize Your Faceless Content
              </h1>

              <p className="text-xl lg:text-2xl text-white/70 leading-relaxed font-light">
                Welcome to a simple way to monetize, sell, and get paid for your faceless content.
              </p>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button
                  onClick={handleGetStarted}
                  className="px-8 py-4 bg-white text-black hover:bg-white/90 font-light rounded-full text-lg transition-all duration-200 hover:scale-105"
                >
                  Get Started
                </Button>

                <Button
                  onClick={handleExplore}
                  variant="outline"
                  className="px-8 py-4 border-2 border-white/30 text-white hover:bg-white/10 font-light rounded-full text-lg transition-all duration-200 hover:scale-105 bg-transparent"
                >
                  Explore
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  )
}
