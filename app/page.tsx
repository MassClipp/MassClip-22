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
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-black">
      {/* Abstract Vector Background */}
      <div className="fixed inset-0 z-0">
        {/* Base dark gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-black to-slate-900" />

        {/* Hexagonal dot pattern overlay */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "20px 20px",
          }}
        />

        {/* Geometric shapes with teal glow */}
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="tealGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: "#14b8a6", stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: "#06b6d4", stopOpacity: 0.8 }} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Large diagonal geometric shape - top right */}
          <polygon
            points="60,0 100,0 100,40 80,60"
            fill="rgba(15,23,42,0.8)"
            stroke="url(#tealGlow)"
            strokeWidth="2"
            filter="url(#glow)"
            vectorEffect="non-scaling-stroke"
            style={{ transform: "scale(10)", transformOrigin: "top right" }}
          />

          {/* Medium geometric shape - center left */}
          <polygon
            points="0,30 20,30 25,50 5,60"
            fill="rgba(15,23,42,0.9)"
            stroke="url(#tealGlow)"
            strokeWidth="2"
            filter="url(#glow)"
            vectorEffect="non-scaling-stroke"
            style={{ transform: "scale(10)", transformOrigin: "center left" }}
          />

          {/* Bottom right accent shape */}
          <polygon
            points="70,80 100,70 100,100 80,100"
            fill="rgba(15,23,42,0.85)"
            stroke="url(#tealGlow)"
            strokeWidth="2"
            filter="url(#glow)"
            vectorEffect="non-scaling-stroke"
            style={{ transform: "scale(10)", transformOrigin: "bottom right" }}
          />

          {/* Glowing accent lines */}
          <line
            x1="0"
            y1="50%"
            x2="30%"
            y2="20%"
            stroke="url(#tealGlow)"
            strokeWidth="3"
            filter="url(#glow)"
            opacity="0.6"
          />
          <line
            x1="70%"
            y1="80%"
            x2="100%"
            y2="60%"
            stroke="url(#tealGlow)"
            strokeWidth="3"
            filter="url(#glow)"
            opacity="0.6"
          />
          <line
            x1="40%"
            y1="0"
            x2="60%"
            y2="40%"
            stroke="url(#tealGlow)"
            strokeWidth="2"
            filter="url(#glow)"
            opacity="0.4"
          />
        </svg>

        {/* Additional glow spots for depth */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      {/* Content layer with glassmorphism */}
      <div className="relative z-10 flex flex-col min-h-screen">
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
              <Link href="/about" className="text-white/80 hover:text-white transition-colors font-light text-sm">
                About Us
              </Link>
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
                  <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                    Vex Organizes Your Content In Seconds
                  </h2>
                  <p className="text-white/60 text-lg leading-relaxed mb-6">
                    No more selling messy zip files. Every piece of content is delivered through a beautiful, HD
                    interface that your customers will love. Professional folder organization that makes browsing and
                    downloading seamless.
                  </p>
                  <p className="text-white/60 text-lg leading-relaxed">
                    VEX automatically structures your content with smart naming conventions and logical groupings. Your
                    customers get a premium experience, not a confusing file dump.
                  </p>
                </div>
                <div className="relative">
                  <div className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl hover:shadow-teal-500/10 transition-all">
                    <img
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/7D123C64-C36B-4ACB-83ED-085BB60E2747.PNG-V4RkOLOzcrUKvamM8cZGlw9BRS9b5W.png"
                      alt="HD Organized Folders Interface"
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
                <p className="text-white/60 text-lg max-w-2xl mx-auto">Organization and sellable bundles in seconds</p>
              </div>

              <div className="mb-16 max-w-4xl mx-auto">
                <div className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
                  <img
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/copy_ACAD5C9D-0800-434F-BC27-E3DE625779B1.JPEG-6TlHbPShOaerHSsdCOqseRiuPKglfX.jpeg"
                    alt="VEX Chat Interface Example"
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
                    Vex does everything for you. Create bundles, set prices, and share your storefront. Get paid
                    instantly via Stripe.
                  </p>
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
    </div>
  )
}

export default LandingPage
