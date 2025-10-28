"use client"

import { motion } from "framer-motion"
import Link from "next/link"

export default function AboutPageClient() {
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
            <span className="font-league-spartan font-bold" style={{ fontFamily: "var(--font-league-spartan)" }}>
              Vex
            </span>
          </div>

          {/* Center Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/dashboard/upgrade" className="text-white/80 hover:text-white transition-colors font-light">
              Upgrade
            </Link>
            <Link href="/dashboard/upload" className="text-white/80 hover:text-white transition-colors font-light">
              Upload
            </Link>
          </div>

          {/* Login */}
          <Link href="/login" className="text-white/80 hover:text-white transition-colors font-light">
            Login
          </Link>
        </nav>
      </header>

      {/* About Us Content */}
      <main className="relative z-10 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-12"
          >
            {/* About Us Section */}
            <div className="space-y-8">
              <h1 className="text-5xl lg:text-6xl font-thin bg-gradient-to-br from-slate-300 via-cyan-200 via-blue-100 to-white bg-clip-text text-transparent leading-tight">
                About Us
              </h1>

              <div className="space-y-6">
                <p className="text-lg lg:text-xl text-white/70 leading-relaxed font-light">
                  MassClip is a digital platform that helps faceless creators monetize their content with zero hassle.
                  If you run a theme page or create B-roll, background videos, sound effects, audio clips, or carousels,
                  there are thousands of other creators who need what you already make.
                </p>

                <p className="text-lg lg:text-xl text-white/70 leading-relaxed font-light">
                  Instead of selling files through messy downloads or complicated exchanges, MassClip gives you a simple
                  storefront where others can browse, preview, and buy your content with ease. But we know the real pain
                  point: organizing your content for sale is tedious and time-consuming.
                </p>

                <p className="text-lg lg:text-xl text-white/70 leading-relaxed font-light">
                  That's where Vex comes in. Too many creators get lazy with organizing folders or content bundles they
                  put up for sale— they either don't organize it at all or spend hours doing manual sorting work. With
                  Vex's AI-powered organization, you can simply tell it what content you want in which folder, what
                  content you want in which bundle, and it does it for you in seconds.
                </p>
              </div>
            </div>

            {/* Our Mission Section */}
            <div className="space-y-8">
              <h2 className="text-4xl lg:text-5xl font-thin bg-gradient-to-br from-slate-300 via-cyan-200 via-blue-100 to-white bg-clip-text text-transparent leading-tight">
                Our Mission
              </h2>

              <div className="space-y-6">
                <p className="text-lg lg:text-xl text-white/70 leading-relaxed font-light">
                  Our mission is to put a store link in the bio of every faceless creator who wants to turn their
                  content into income—without the headache of manual organization. Too many creators put in serious work
                  but never see the financial return, often because organizing content for sale feels overwhelming.
                </p>

                <p className="text-lg lg:text-xl text-white/70 leading-relaxed font-light">
                  MassClip changes that by giving you the tools to set up your own digital store, and Vex makes it
                  effortless to organize everything. No more spending hours sorting files or creating bundle packs
                  manually. Just tell Vex what you want sorted, describe the bundle packs you want to sell, and it makes
                  it happen in a short amount of time.
                </p>

                <p className="text-lg lg:text-xl text-white/70 leading-relaxed font-light">
                  You should not have to chase payments, waste time on tedious organization, or let great content sit
                  unorganized. You should be building your brand and getting paid for the content you already know how
                  to create—while Vex handles the busy work of keeping everything perfectly organized.
                </p>
              </div>
            </div>

            {/* Contact Section */}
            <div className="space-y-6 pt-8 border-t border-white/10">
              <p className="text-lg text-white/70 leading-relaxed font-light">
                Have questions or need support? Contact us at{" "}
                <a
                  href="mailto:contact@massclip.pro"
                  className="bg-gradient-to-br from-slate-300 via-cyan-200 via-blue-100 to-white bg-clip-text text-transparent hover:from-white hover:to-white transition-all duration-200"
                >
                  contact@massclip.pro
                </a>
              </p>
            </div>

            {/* Back to Home */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="pt-8"
            >
              <Link
                href="/"
                className="inline-flex items-center px-8 py-4 bg-white text-black hover:bg-white/90 font-light rounded-full text-lg transition-all duration-200 hover:scale-105"
              >
                Back to Home
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 bg-white py-4 px-6 mt-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

            {/* Company */}
            <div>
              <h3 className="text-black font-light text-lg mb-4">Company</h3>
              <div className="space-y-3">
                <Link href="/about" className="block text-gray-600 hover:text-black transition-colors font-light">
                  About Us
                </Link>
                <a
                  href="mailto:contact@massclip.pro"
                  className="block text-gray-600 hover:text-black transition-colors font-light"
                >
                  contact@massclip.pro
                </a>
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
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 mt-6 pt-4">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-gray-600 font-light">© 2025 Vex. All rights reserved.</div>
              <div className="text-black font-light text-xl mt-4 md:mt-0">
                <span className="font-league-spartan font-bold" style={{ fontFamily: "var(--font-league-spartan)" }}>
                  Vex
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
