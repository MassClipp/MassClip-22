"use client"
import Link from "next/link"
import type React from "react"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useEffect, useRef, useState } from "react"

const LandingPage = () => {
  const router = useRouter()
  const observerRef = useRef<IntersectionObserver | null>(null)
  const [inputValue, setInputValue] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => {
      // Pre-warm router for better UX
      router.prefetch("/signup")
      router.prefetch("/dashboard/explore")
      router.prefetch("/dashboard/upgrade")
      router.prefetch("/dashboard/uploads")
    }, 100)

    return () => clearTimeout(timer)
  }, [router])

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-in")
          }
        })
      },
      { threshold: 0.1, rootMargin: "50px" },
    )

    const elements = document.querySelectorAll(".scroll-animate")
    elements.forEach((el) => observerRef.current?.observe(el))

    return () => observerRef.current?.disconnect()
  }, [])

  const handleGetStarted = () => {
    router.push("/signup")
  }

  const handleUpload = () => {
    router.push("/dashboard/uploads")
  }

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) {
      // For now, redirect to signup with the input as a query parameter
      router.push(`/signup?content=${encodeURIComponent(inputValue)}`)
    }
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-tl from-cyan-200/20 via-white/10 to-transparent opacity-70" />
      <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-gradient-radial from-cyan-100/15 to-transparent opacity-90" />
      <div className="absolute top-0 left-0 w-1/3 h-1/3 bg-gradient-radial from-slate-300/10 to-transparent opacity-60" />

      <header className="relative z-10 px-6 py-6">
        <nav className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="text-white font-light text-2xl">
            <span className="font-league-spartan font-bold" style={{ fontFamily: "var(--font-league-spartan)" }}>
              Vex
            </span>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <Link href="/dashboard/upgrade" className="text-white/80 hover:text-white transition-colors font-light">
              Upgrade
            </Link>
            <Link href="/dashboard/uploads" className="text-white/80 hover:text-white transition-colors font-light">
              Upload
            </Link>
            <Link href="/about" className="text-white/80 hover:text-white transition-colors font-light">
              About Us
            </Link>
          </div>

          <Link href="/login" className="text-white/80 hover:text-white transition-colors font-light">
            Login
          </Link>
        </nav>
      </header>

      <main className="relative z-10 flex items-center justify-center min-h-[calc(100vh-120px)] px-6">
        <div className="max-w-4xl mx-auto w-full text-center">
          <div className="space-y-8">
            <h1 className="text-5xl lg:text-7xl font-thin text-white leading-tight text-balance">
              What do you want to sell?
            </h1>

            <p className="text-lg lg:text-xl text-white/70 leading-relaxed font-light max-w-2xl mx-auto text-pretty">
              Organize and your content into sellable bundles in seconds with Vex.
            </p>

            <div className="pt-8">
              <form onSubmit={handleInputSubmit} className="max-w-2xl mx-auto">
                <div className="relative">
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Describe what you want to sell..."
                    className="w-full min-h-[120px] p-6 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/40 resize-none focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent backdrop-blur-sm text-lg leading-relaxed"
                    rows={4}
                  />
                  <div className="absolute bottom-4 right-4 flex items-center gap-3">
                    <button
                      type="button"
                      className="p-2 text-white/40 hover:text-white/60 transition-colors"
                      aria-label="Add attachment"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </button>
                    <button
                      type="submit"
                      disabled={!inputValue.trim()}
                      className="p-2 text-white/40 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Submit"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M7 17L17 7M17 7H7M17 7V17" />
                      </svg>
                    </button>
                  </div>
                </div>
              </form>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button
                onClick={handleGetStarted}
                className="px-8 py-4 bg-white text-black hover:bg-white/90 font-light rounded-full text-lg transition-all duration-200"
              >
                Get Started
              </Button>

              <Button
                onClick={handleUpload}
                variant="outline"
                className="px-8 py-4 border-2 border-white/30 text-white hover:bg-white/10 font-light rounded-full text-lg transition-all duration-200 bg-transparent"
              >
                Upload
              </Button>
            </div>
          </div>
        </div>
      </main>

      <section className="relative z-10 py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="scroll-animate space-y-8">
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
          </div>
        </div>
      </section>

      <section className="relative z-10 py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="scroll-animate grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <img
                src="/images/folder-structure-interface.png"
                alt="HD Folder Structure Interface"
                className="w-full max-w-md mx-auto rounded-lg shadow-2xl"
              />
            </div>

            <div className="order-1 lg:order-2 space-y-6">
              <h2 className="text-4xl lg:text-5xl font-thin text-white">HD Folders</h2>

              <div className="space-y-4">
                <p className="text-lg lg:text-xl text-white/70 leading-relaxed font-light">
                  Create organized, specific folders for all your content uploads in crystal-clear HD quality. No more
                  dealing with messy raw files or complicated file management.
                </p>

                <p className="text-lg lg:text-xl text-white/70 leading-relaxed font-light">
                  Say goodbye to selling chaotic zip folders to your audience. MassClip handles all file storage and
                  organization automatically, ensuring everything stays in HD and perfectly organized.
                </p>

                <p className="text-lg lg:text-xl text-white/70 leading-relaxed font-light">
                  Your customers get clean, professional access to high-quality content without the frustration of
                  downloading and extracting messy zip files. Everything is streamlined, organized, and ready to use.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="scroll-animate space-y-12">
            <h2 className="text-4xl lg:text-5xl font-thin text-white">What You Can Sell</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div
                className="scroll-animate bg-white p-8 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                style={{ animationDelay: "0.1s" }}
              >
                <h3 className="text-xl font-light text-black mb-4">B-Roll Content</h3>
                <p className="text-gray-600 font-light leading-relaxed">
                  High-quality background footage that creators can use to enhance their videos and storytelling.
                </p>
              </div>

              <div
                className="scroll-animate bg-white p-8 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                style={{ animationDelay: "0.2s" }}
              >
                <h3 className="text-xl font-light text-black mb-4">Background Videos</h3>
                <p className="text-gray-600 font-light leading-relaxed">
                  Looping video backgrounds perfect for social media posts, presentations, and content creation.
                </p>
              </div>

              <div
                className="scroll-animate bg-white p-8 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                style={{ animationDelay: "0.3s" }}
              >
                <h3 className="text-xl font-light text-black mb-4">Audio Tracks</h3>
                <p className="text-gray-600 font-light leading-relaxed">
                  Music, sound effects, and audio clips that creators can use to enhance their content.
                </p>
              </div>

              <div
                className="scroll-animate bg-white p-8 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                style={{ animationDelay: "0.4s" }}
              >
                <h3 className="text-xl font-light text-black mb-4">Carousels</h3>
                <p className="text-gray-600 font-light leading-relaxed">
                  Ready-made carousel posts and slide templates for Instagram, LinkedIn, and other platforms.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 bg-white py-4 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

export default LandingPage
