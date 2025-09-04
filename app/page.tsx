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
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/15 animate-pulse"
          style={{ animationDuration: "6s" }}
        />
        <div
          className="absolute inset-0 bg-gradient-to-tl from-transparent via-white/25 to-white/30 opacity-70"
          style={{
            animation: "float 10s ease-in-out infinite",
            animationDelay: "1s",
          }}
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-white/15 via-white/35 to-white/10 opacity-60"
          style={{
            animation: "drift 12s linear infinite",
            animationDelay: "3s",
          }}
        />
        <div
          className="absolute inset-0 bg-gradient-to-bl from-white/10 via-white/20 to-transparent opacity-50"
          style={{
            animation: "sweep 14s ease-in-out infinite",
            animationDelay: "5s",
          }}
        />
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); opacity: 0.7; }
          33% { transform: translateY(-30px) translateX(20px) rotate(1deg); opacity: 0.9; }
          66% { transform: translateY(10px) translateX(-15px) rotate(-0.5deg); opacity: 0.8; }
        }
        @keyframes drift {
          0% { transform: translateX(-150px) translateY(0px) scale(1); }
          25% { transform: translateX(50px) translateY(-20px) scale(1.1); }
          50% { transform: translateX(150px) translateY(10px) scale(0.95); }
          75% { transform: translateX(-50px) translateY(20px) scale(1.05); }
          100% { transform: translateX(-150px) translateY(0px) scale(1); }
        }
        @keyframes sweep {
          0% { transform: translateX(100vw) translateY(-50px) rotate(0deg); }
          50% { transform: translateX(-50px) translateY(30px) rotate(2deg); }
          100% { transform: translateX(-100vw) translateY(-20px) rotate(-1deg); }
        }
      `}</style>

      <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-gradient-radial from-white/25 via-white/15 to-transparent opacity-90" />

      {/* Header */}
      <header className="relative z-10 px-6 py-6">
        <nav className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="text-white font-light text-xl">MassClip</div>

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
          <div className="max-w-3xl -ml-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-6"
            >
              <h1 className="text-5xl lg:text-7xl font-thin text-white leading-tight">
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
        </div>
      </main>

      <section className="relative z-10 bg-black py-20 px-6">
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
      <section className="relative z-10 bg-black py-20 px-6">
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
    </div>
  )
}
