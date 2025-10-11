"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useEffect } from "react"
import { LandingVexInterface } from "@/components/landing-vex-interface"
import { Sparkles, Package, TrendingUp } from "lucide-react"

const LandingPage = () => {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.prefetch("/signup")
      router.prefetch("/login")
    }, 100)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-black to-teal-950 flex flex-col">
      <header className="sticky top-0 z-50 border-b border-white/20 bg-white/5 backdrop-blur-2xl shadow-lg">
        <nav className="flex items-center justify-between max-w-7xl mx-auto px-6 py-4 relative">
          <div className="text-white font-light text-2xl">
            <span className="font-league-spartan font-bold" style={{ fontFamily: "var(--font-league-spartan)" }}>
              Vex
            </span>
          </div>

          <div className="absolute left-1/2 transform -translate-x-1/2 hidden md:flex items-center gap-6">
            <a href="#features" className="text-white/80 hover:text-white transition-colors font-light text-sm">
              Features
            </a>
            <a href="#how-it-works" className="text-white/80 hover:text-white transition-colors font-light text-sm">
              How It Works
            </a>
            <a href="#about" className="text-white/80 hover:text-white transition-colors font-light text-sm">
              About Us
            </a>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-white/80 hover:text-white transition-colors font-light text-sm">
              Login
            </Link>
            <Button
              onClick={() => router.push("/signup")}
              className="bg-gradient-to-r from-teal-500 to-cyan-400 text-white hover:from-teal-600 hover:to-cyan-500 font-light rounded-full px-6 py-2 text-sm shadow-lg shadow-teal-500/20"
            >
              Sign Up Free
            </Button>
          </div>
        </nav>
      </header>

      <main className="flex-1 flex flex-col">
        {/* VEX Interface Hero Section */}
        <LandingVexInterface />

        <section className="py-24 px-6 border-t border-white/10">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">HD Organized Folders</h2>
                <p className="text-white/60 text-lg leading-relaxed mb-6">
                  VEX automatically organizes your content into beautifully structured folders based on themes, topics,
                  and content type. No more messy file systems or manual sorting.
                </p>
                <p className="text-white/60 text-lg leading-relaxed">
                  Every folder is optimized for selling, with smart naming conventions and logical groupings that make
                  sense to your customers.
                </p>
              </div>
              <div className="relative">
                <div className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl hover:shadow-teal-500/10 transition-all">
                  <img
                    src="/placeholder.svg?height=400&width=600"
                    alt="HD Organized Folders"
                    className="w-full rounded-lg shadow-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-24 px-6 border-t border-white/10">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Everything you need to sell content</h2>
              <p className="text-white/60 text-lg max-w-2xl mx-auto">
                VEX AI handles the heavy lifting so you can focus on creating
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-8 hover:bg-white/10 hover:border-white/30 transition-all shadow-xl hover:shadow-2xl hover:shadow-teal-500/10">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-teal-500 to-cyan-400 flex items-center justify-center mb-6 shadow-lg shadow-teal-500/30">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">AI-Powered Organization</h3>
                <p className="text-white/60">
                  VEX analyzes your content and automatically suggests the best way to organize and bundle your files
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-8 hover:bg-white/10 hover:border-white/30 transition-all shadow-xl hover:shadow-2xl hover:shadow-cyan-500/10">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-teal-500 to-cyan-400 flex items-center justify-center mb-6 shadow-lg shadow-cyan-500/30">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Smart Bundling</h3>
                <p className="text-white/60">
                  Create sellable bundles in seconds with AI recommendations for pricing and packaging
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-8 hover:bg-white/10 hover:border-white/30 transition-all shadow-xl hover:shadow-2xl hover:shadow-teal-500/10">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-teal-500 to-cyan-400 flex items-center justify-center mb-6 shadow-lg shadow-teal-500/30">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Instant Storefront</h3>
                <p className="text-white/60">
                  Get a professional storefront automatically generated for your content with zero setup
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-24 px-6 border-t border-white/10">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">How VEX Works</h2>
              <p className="text-white/60 text-lg max-w-2xl mx-auto">From upload to sale in three simple steps</p>
            </div>

            <div className="mb-16 max-w-4xl mx-auto">
              <div className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
                <img
                  src="/placeholder.svg?height=500&width=800"
                  alt="How VEX Works"
                  className="w-full rounded-lg shadow-lg"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-12">
              <div className="text-center bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-8 hover:bg-white/10 hover:border-white/30 transition-all shadow-xl">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-teal-500 to-cyan-400 flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-lg shadow-teal-500/30">
                  1
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Upload Your Content</h3>
                <p className="text-white/60">
                  Drop your videos, audio, or files into VEX. No limits on what you can upload.
                </p>
              </div>

              <div className="text-center bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-8 hover:bg-white/10 hover:border-white/30 transition-all shadow-xl">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-teal-500 to-cyan-400 flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-lg shadow-cyan-500/30">
                  2
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Let VEX Analyze</h3>
                <p className="text-white/60">
                  VEX AI analyzes your content and suggests the best organization and bundle strategies.
                </p>
              </div>

              <div className="text-center bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-8 hover:bg-white/10 hover:border-white/30 transition-all shadow-xl">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-teal-500 to-cyan-400 flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-lg shadow-teal-500/30">
                  3
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Start Selling</h3>
                <p className="text-white/60">
                  Create bundles, set prices, and share your storefront. Get paid instantly via Stripe.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="py-24 px-6 border-t border-white/10">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">About VEX</h2>
            <p className="text-white/60 text-lg leading-relaxed mb-8">
              VEX is an AI-powered platform that helps content creators organize, bundle, and sell their digital content
              effortlessly. We believe creators should spend their time creating, not managing files and storefronts.
            </p>
            <p className="text-white/60 text-lg leading-relaxed mb-8">
              Our AI assistant, VEX, analyzes your content to provide intelligent recommendations for organization,
              bundling strategies, and pricing. Whether you're selling courses, templates, videos, or any digital
              product, VEX makes it simple.
            </p>
            <div className="flex flex-wrap justify-center gap-8 mt-12">
              <div className="text-center bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-6 min-w-[180px] shadow-xl hover:bg-white/10 hover:border-white/30 transition-all">
                <div className="text-3xl font-bold text-white mb-2">AI-Powered</div>
                <div className="text-white/60">Smart recommendations</div>
              </div>
              <div className="text-center bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-6 min-w-[180px] shadow-xl hover:bg-white/10 hover:border-white/30 transition-all">
                <div className="text-3xl font-bold text-white mb-2">Instant Setup</div>
                <div className="text-white/60">No configuration needed</div>
              </div>
              <div className="text-center bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-6 min-w-[180px] shadow-xl hover:bg-white/10 hover:border-white/30 transition-all">
                <div className="text-3xl font-bold text-white mb-2">Creator First</div>
                <div className="text-white/60">Built for your success</div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 px-6 border-t border-white/10">
          <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-teal-500/10 to-cyan-400/10 backdrop-blur-xl border border-white/20 rounded-3xl p-12 shadow-2xl">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Ready to start selling?</h2>
            <p className="text-white/60 text-lg mb-8">
              Try VEX for free. Upload your content and see what VEX can do for you.
            </p>
            <Button
              onClick={() => router.push("/signup")}
              size="lg"
              className="bg-gradient-to-r from-teal-500 to-cyan-400 text-white hover:from-teal-600 hover:to-cyan-500 font-light rounded-full px-8 py-6 text-lg shadow-xl shadow-teal-500/30 hover:shadow-2xl hover:shadow-teal-500/40 transition-all"
            >
              Get Started For Free
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/20 bg-white/5 backdrop-blur-xl py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-white/60 font-light text-sm">© 2025 Vex. All rights reserved.</div>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/terms" className="text-white/60 hover:text-white transition-colors font-light">
              Terms
            </Link>
            <Link href="/privacy" className="text-white/60 hover:text-white transition-colors font-light">
              Privacy
            </Link>
            <a
              href="mailto:contact@massclip.pro"
              className="text-white/60 hover:text-white transition-colors font-light"
            >
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
