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
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-tl from-white/30 via-white/10 to-transparent opacity-70" />
      <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-gradient-radial from-white/25 via-white/12 to-transparent opacity-90" />
      <div className="absolute top-0 left-0 w-1/3 h-1/3 bg-gradient-radial from-white/15 via-white/5 to-transparent opacity-60" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-white/10 opacity-50" />

      {/* Header */}
      <header className="relative z-10 px-6 py-6">
        <nav className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="text-white font-light text-2xl">
            Mass<span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Clip</span>
          </div>

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
      <main className="relative z-10 flex items-center justify-start min-h-[calc(100vh-120px)] px-6">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Left side - moved to far left and vertically centered */}
            <div className="max-w-3xl">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="space-y-6"
              >
                <h1 className="text-5xl lg:text-7xl font-thin text-white/80 leading-tight">
                  Monetize Your Faceless Content
                </h1>

                <p className="text-lg lg:text-xl text-white/70 leading-relaxed font-light">
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

            {/* Right side - larger stylized text with flowing anodized pearl gradient */}
            <div className="hidden lg:flex flex-col items-center justify-center space-y-6 h-full">
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1, delay: 0.3 }}
                className="text-center"
              >
                {/* Single flowing gradient across all three words */}
                <div className="text-8xl xl:text-9xl font-extralight leading-none tracking-tight">
                  <div className="bg-gradient-to-br from-slate-300 via-cyan-200 via-blue-100 to-white bg-clip-text text-transparent drop-shadow-2xl">
                    <div className="mb-2">Capitalize</div>
                    <div className="mb-2">Sell</div>
                    <div>Monetize</div>
                  </div>
                </div>
              </motion.div>

              {/* Enhanced accent elements for anodized pearl stainless steel effect */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="flex space-x-3"
              >
                <div className="w-20 h-px bg-gradient-to-r from-transparent via-slate-300/80 to-transparent shadow-lg"></div>
                <div className="w-20 h-px bg-gradient-to-r from-transparent via-cyan-200/80 to-transparent shadow-lg"></div>
                <div className="w-20 h-px bg-gradient-to-r from-transparent via-blue-100/80 to-transparent shadow-lg"></div>
                <div className="w-20 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent shadow-lg"></div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      {/* Earning Money Section */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <h2 className="text-4xl lg:text-5xl font-thin text-white">Earning Money As A Faceless Creator</h2>

            <div className="max-w-4xl">
              <p className="text-lg lg:text-xl text-white/70 leading-relaxed font-light">
                If you run a faceless page, you already create content that other creators need. Whether it is
                motivation, memes, sports, trending topics, or cinema, your posts can be packaged and sold. Creators are
                constantly looking for ready-to-use content that saves them time and effort, and you can turn what you
                are already making into a new source of income.
              </p>

              <p className="text-lg lg:text-xl text-white/70 leading-relaxed font-light mt-6">
                We provide you with a profile style storefront where you can showcase your work. Share free downloads to
                grow your audience and offer premium content for purchase, giving creators exactly what they want while
                you build a steady stream of revenue.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* What You Can Sell Section */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="space-y-12"
          >
            <h2 className="text-4xl lg:text-5xl font-thin text-white">What You Can Sell</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
                className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <h3 className="text-xl font-light text-black mb-4">B-Roll Content</h3>
                <p className="text-gray-600 font-light leading-relaxed">
                  High-quality background footage that creators can use to enhance their videos and storytelling.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <h3 className="text-xl font-light text-black mb-4">Background Videos</h3>
                <p className="text-gray-600 font-light leading-relaxed">
                  Looping video backgrounds perfect for social media posts, presentations, and content creation.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                viewport={{ once: true }}
                className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <h3 className="text-xl font-light text-black mb-4">Audio Tracks</h3>
                <p className="text-gray-600 font-light leading-relaxed">
                  Music, sound effects, and audio clips that creators can use to enhance their content.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                viewport={{ once: true }}
                className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <h3 className="text-xl font-light text-black mb-4">Carousels</h3>
                <p className="text-gray-600 font-light leading-relaxed">
                  Ready-made carousel posts and slide templates for Instagram, LinkedIn, and other platforms.
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-white py-4 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Company */}
            <div>
              <h3 className="text-black font-light text-lg mb-4">Company</h3>
              <div className="space-y-3">
                <Link href="/about" className="block text-gray-600 hover:text-black transition-colors font-light">
                  About
                </Link>
                <Link href="/contact" className="block text-gray-600 hover:text-black transition-colors font-light">
                  Contact
                </Link>
                <Link href="/careers" className="block text-gray-600 hover:text-black transition-colors font-light">
                  Careers
                </Link>
              </div>
            </div>

            {/* Resources */}
            <div>
              <h3 className="text-black font-light text-lg mb-4">Resources</h3>
              <div className="space-y-3">
                <Link
                  href="/resources/free-content"
                  className="block text-gray-600 hover:text-black transition-colors font-light"
                >
                  How to use free content
                </Link>
                <Link
                  href="/resources/optimize-storefront"
                  className="block text-gray-600 hover:text-black transition-colors font-light"
                >
                  How to optimize your storefront
                </Link>
                <Link
                  href="/resources/organize-bundles"
                  className="block text-gray-600 hover:text-black transition-colors font-light"
                >
                  How to organize your bundles
                </Link>
              </div>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-black font-light text-lg mb-4">Legal</h3>
              <div className="space-y-3">
                <Link href="/terms" className="block text-gray-600 hover:text-black transition-colors font-light">
                  Terms of Service
                </Link>
                <Link href="/privacy" className="block text-gray-600 hover:text-black transition-colors font-light">
                  Privacy Policy
                </Link>
                <Link href="/cookies" className="block text-gray-600 hover:text-black transition-colors font-light">
                  Cookie Policy
                </Link>
              </div>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-black font-light text-lg mb-4">Support</h3>
              <div className="space-y-3">
                <Link href="/help" className="block text-gray-600 hover:text-black transition-colors font-light">
                  Help Center
                </Link>
                <Link href="/support" className="block text-gray-600 hover:text-black transition-colors font-light">
                  Contact Support
                </Link>
                <Link href="/status" className="block text-gray-600 hover:text-black transition-colors font-light">
                  System Status
                </Link>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 mt-6 pt-4">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-gray-600 font-light">© 2025 MassClip. All rights reserved.</div>
              <div className="text-black font-light text-xl mt-4 md:mt-0">
                Mass<span className="bg-gradient-to-r from-black to-black/60 bg-clip-text text-transparent">Clip</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
