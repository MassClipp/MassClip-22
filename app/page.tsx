"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LandingVexDemo } from "@/components/landing-vex-demo"
import { LandingUploadDemo } from "@/components/landing-upload-demo"
import { LandingBundlesDemo } from "@/components/landing-bundles-demo"
import { Sparkles, Upload, Package, Info } from "lucide-react"

const LandingPage = () => {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("vex")

  useEffect(() => {
    const timer = setTimeout(() => {
      router.prefetch("/signup")
      router.prefetch("/login")
    }, 100)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-black">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <nav className="flex items-center justify-between max-w-7xl mx-auto px-6 py-4">
          <div className="text-white font-light text-2xl">
            <span className="font-league-spartan font-bold" style={{ fontFamily: "var(--font-league-spartan)" }}>
              Vex
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1 bg-white/5 rounded-full p-1">
            <button
              onClick={() => setActiveTab("vex")}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                activeTab === "vex" ? "bg-white text-black" : "text-white/70 hover:text-white"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span className="font-light">VEX AI</span>
            </button>
            <button
              onClick={() => setActiveTab("upload")}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                activeTab === "upload" ? "bg-white text-black" : "text-white/70 hover:text-white"
              }`}
            >
              <Upload className="w-4 h-4" />
              <span className="font-light">Upload</span>
            </button>
            <button
              onClick={() => setActiveTab("bundles")}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                activeTab === "bundles" ? "bg-white text-black" : "text-white/70 hover:text-white"
              }`}
            >
              <Package className="w-4 h-4" />
              <span className="font-light">Bundles</span>
            </button>
            <button
              onClick={() => setActiveTab("about")}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                activeTab === "about" ? "bg-white text-black" : "text-white/70 hover:text-white"
              }`}
            >
              <Info className="w-4 h-4" />
              <span className="font-light">About</span>
            </button>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-white/80 hover:text-white transition-colors font-light text-sm">
              Login
            </Link>
            <Button
              onClick={() => router.push("/signup")}
              className="bg-gradient-to-r from-teal-500 to-cyan-400 text-white hover:from-teal-600 hover:to-cyan-500 font-light rounded-full px-6 py-2 text-sm"
            >
              Sign Up Free
            </Button>
          </div>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Mobile tab list */}
          <TabsList className="md:hidden w-full grid grid-cols-4 mb-8 bg-white/5">
            <TabsTrigger value="vex" className="data-[state=active]:bg-white data-[state=active]:text-black">
              <Sparkles className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="upload" className="data-[state=active]:bg-white data-[state=active]:text-black">
              <Upload className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="bundles" className="data-[state=active]:bg-white data-[state=active]:text-black">
              <Package className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="about" className="data-[state=active]:bg-white data-[state=active]:text-black">
              <Info className="w-4 h-4" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vex" className="mt-0">
            <LandingVexDemo />
          </TabsContent>

          <TabsContent value="upload" className="mt-0">
            <LandingUploadDemo />
          </TabsContent>

          <TabsContent value="bundles" className="mt-0">
            <LandingBundlesDemo />
          </TabsContent>

          <TabsContent value="about" className="mt-0">
            <AboutSection />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-white/10 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-white font-light text-lg mb-4">Resources</h3>
              <div className="space-y-2">
                <Link
                  href="/resources/free-content"
                  className="block text-white/60 hover:text-white transition-colors font-light text-sm"
                >
                  How to use free content
                </Link>
                <Link
                  href="/resources/optimize-storefront"
                  className="block text-white/60 hover:text-white transition-colors font-light text-sm"
                >
                  How to optimize your storefront
                </Link>
              </div>
            </div>

            <div>
              <h3 className="text-white font-light text-lg mb-4">Company</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setActiveTab("about")}
                  className="block text-white/60 hover:text-white transition-colors font-light text-sm"
                >
                  About Us
                </button>
                <a
                  href="mailto:contact@massclip.pro"
                  className="block text-white/60 hover:text-white transition-colors font-light text-sm"
                >
                  contact@massclip.pro
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-white font-light text-lg mb-4">Legal</h3>
              <div className="space-y-2">
                <Link
                  href="/terms"
                  className="block text-white/60 hover:text-white transition-colors font-light text-sm"
                >
                  Terms of Service
                </Link>
                <Link
                  href="/privacy"
                  className="block text-white/60 hover:text-white transition-colors font-light text-sm"
                >
                  Privacy Policy
                </Link>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="text-white/60 font-light text-sm">© 2025 Vex. All rights reserved.</div>
            <div className="text-white font-light text-xl mt-4 md:mt-0">
              <span className="font-league-spartan font-bold" style={{ fontFamily: "var(--font-league-spartan)" }}>
                Vex
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

const AboutSection = () => {
  const router = useRouter()

  return (
    <div className="space-y-16">
      {/* Hero */}
      <div className="text-center space-y-6 py-12">
        <h1 className="text-5xl lg:text-7xl font-thin text-white leading-tight text-balance">
          What do you want to sell?
        </h1>
        <p className="text-lg lg:text-xl text-white/70 leading-relaxed font-light max-w-2xl mx-auto text-pretty">
          Organize and create sellable bundles in seconds with Vex.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button
            onClick={() => router.push("/signup")}
            className="px-8 py-6 bg-white text-black hover:bg-white/90 font-light rounded-full text-lg"
          >
            Get Started For Free
          </Button>
        </div>
      </div>

      {/* What Does Vex Do */}
      <section className="py-12 px-6 bg-white/5 rounded-3xl">
        <h2 className="text-4xl lg:text-5xl font-thin text-white text-center mb-12">What Does Vex Do?</h2>
        <div className="flex flex-col lg:flex-row gap-12 items-center">
          <div className="flex-1">
            <p className="text-xl text-white/70 leading-relaxed font-light">
              Simply upload your content, tell Vex what kind of bundles you want to sell, and watch as Vex intelligently
              organizes your content into professional, sellable bundles ready for market in seconds. No more manual
              sorting, no more messy file management, just streamlined content monetization.
            </p>
          </div>
          <div className="flex-1">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/6ABFEE6A-4223-490F-A7AE-3B1C50E59EBE-rvZ59rJqIizqTXXekuCOctKp0deD0h.jpg"
              alt="Vex AI creating bundles"
              className="w-full max-w-lg mx-auto rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* What You Can Sell */}
      <section className="space-y-12">
        <h2 className="text-4xl lg:text-5xl font-thin text-white text-center">What You Can Sell</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: "B-Roll Content", desc: "High-quality background footage for creators" },
            { title: "Background Videos", desc: "Looping video backgrounds for social media" },
            { title: "Audio Tracks", desc: "Music and sound effects for content" },
            { title: "Carousels", desc: "Ready-made carousel posts and templates" },
          ].map((item, i) => (
            <div
              key={i}
              className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-white/20 transition-all"
            >
              <h3 className="text-xl font-light text-white mb-3">{item.title}</h3>
              <p className="text-white/60 font-light leading-relaxed text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default LandingPage
