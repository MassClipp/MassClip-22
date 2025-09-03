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
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-white">
      {/* Header */}
      <header className="relative z-10 px-6 py-6">
        <nav className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold tracking-tight">
            <span className="text-red-500">MASS</span>
            <span className="text-white">CLIP</span>
          </Link>

          {/* Center Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/pricing" className="text-white/80 hover:text-white transition-colors font-medium">
              Pricing
            </Link>
            <Link href="/explore" className="text-white/80 hover:text-white transition-colors font-medium">
              Explore
            </Link>
          </div>

          {/* Login */}
          <Link href="/login" className="text-white/80 hover:text-white transition-colors font-medium">
            Login
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex items-center justify-center min-h-[calc(100vh-120px)] px-6">
        <div className="max-w-7xl mx-auto w-full">
          <div className="flex flex-col lg:flex-row items-center justify-between">
            {/* Left Content */}
            <div className="lg:w-1/2 space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="space-y-6"
              >
                <h1 className="text-5xl lg:text-7xl font-bold text-white leading-tight">
                  Monetize Your <span className="text-red-500">Faceless</span> Content
                </h1>

                <p className="text-xl lg:text-2xl text-white/70 leading-relaxed max-w-2xl">
                  Welcome to a simple way to monetize, sell, and get paid for your faceless content.
                </p>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button
                    onClick={handleGetStarted}
                    className="px-8 py-4 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-full text-lg transition-all duration-200 hover:scale-105"
                  >
                    Get Started
                  </Button>

                  <Button
                    onClick={handleExplore}
                    variant="outline"
                    className="px-8 py-4 border-2 border-white/30 text-white hover:bg-white/10 font-semibold rounded-full text-lg transition-all duration-200 hover:scale-105 bg-transparent"
                  >
                    Explore
                  </Button>
                </div>
              </motion.div>
            </div>

            {/* Right Side - Optional Visual Element */}
            <div className="lg:w-1/2 mt-12 lg:mt-0 flex justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 0.3 }}
                className="w-96 h-96 bg-gradient-to-br from-red-500/20 to-white/10 rounded-full blur-3xl"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
