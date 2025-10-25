"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { LandingVexInterface } from "@/components/landing-vex-interface"
import { LandingReview } from "@/components/landing-review"
import { Sparkles, Package, TrendingUp } from "lucide-react"

const LandingPage = () => {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      router.prefetch("/signup")
      router.prefetch("/login")
    }, 100)

    return () => clearTimeout(timer)
  }, [router])

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 100)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-black">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-black" />

        <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 left-1/4 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-teal-400/3 rounded-full blur-[80px]" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="sticky top-0 z-50 backdrop-blur-xl">
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

          {/* Review Section */}
          <LandingReview />

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
