import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LandingVexInterface } from "@/components/landing-vex-interface"
import { LandingReview } from "@/components/landing-review"
import { LandingVideoCarousel } from "@/components/landing-video-carousel"
import Image from "next/image"

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-black">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-black" />

        <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-white/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 left-1/4 w-[500px] h-[500px] bg-white/8 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-white/6 rounded-full blur-[80px]" />
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
              <Link href="/signup" className="text-white/80 hover:text-white transition-colors font-light text-sm">
                Start Selling
              </Link>
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
              <Link href="/signup">
                <Button className="bg-white text-black hover:bg-gray-200 font-light rounded-full px-6 py-2 text-sm shadow-lg shadow-white/20">
                  Sign Up Free
                </Button>
              </Link>
            </div>
          </nav>
        </header>

        <main className="flex-1 flex flex-col">
          {/* VEX Interface Hero Section */}
          <LandingVexInterface />

          <section className="py-16 px-6">
            <div className="max-w-4xl mx-auto text-center">
              <p className="text-white font-semibold text-lg md:text-xl leading-relaxed">
                Scaling your faceless brand revenue deserves serious energy. That's why we're here.
              </p>
            </div>
          </section>

          <section className="py-12 px-6">
            <div className="max-w-7xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                Creators sell billions in content every year.
              </h2>
              <p className="text-white/60 text-lg">Get your storefront live and start earning today.</p>
            </div>
          </section>

          <LandingVideoCarousel />

          {/* Review Section */}
          <LandingReview />

          {/* Headquarters Section */}
          <section className="py-24 px-6 border-t border-white/10">
            <div className="max-w-7xl mx-auto">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                    A Headquarters For Your Faceless Brand Monetization
                  </h2>
                  <p className="text-white/60 text-lg leading-relaxed">
                    You need a home, a storefront, a headquarters where all your digital products for your faceless brand live. Whether you have content packs, ebooks, communities, or brand merch, all of it should be taken seriously in one manageable space. This is where your audience comes to discover, explore, and buy everything you create.
                  </p>
                </div>
                <div className="relative">
                  <div className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl hover:shadow-white/10 transition-all">
                    <Image
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-11-16%20at%202.35.22%20PM-lfX2NIXUhBysfJ4aU0t4pYT5UvtPwz.png"
                      alt="eBook Product Display"
                      width={800}
                      height={600}
                      className="w-full rounded-lg shadow-lg"
                      loading="lazy"
                      quality={85}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Ready To Take Scaling Seriously Section */}
          <section id="how-it-works" className="py-24 px-6 border-t border-white/10">
            <div className="max-w-7xl mx-auto">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="relative">
                  <div className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl hover:shadow-white/10 transition-all">
                    <Image
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%20Nov%2015%2C%202025%20at%2010_22_45%20PM-tXxENDb7CClHvXBHyr1rzZQWwBPR5I.png"
                      alt="MRR Growth Dashboard"
                      width={800}
                      height={600}
                      className="w-full rounded-lg shadow-lg"
                      loading="lazy"
                      quality={85}
                    />
                  </div>
                </div>
                <div>
                  <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                    Ready To Take Scaling Seriously?
                  </h2>
                  <p className="text-white/60 text-lg leading-relaxed">
                    You're only one commitment, one decision, one investment away from your faceless brand doing numbers you couldn't imagine financially, and socially. Anyone can do it, the difference is are you willing to bet on yourself? We'll be waiting on the other side for you when you're ready.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="py-24 px-6 border-t border-white/10">
            <div className="max-w-4xl mx-auto text-center bg-white/5 backdrop-blur-xl border border-white/20 rounded-3xl p-12 shadow-2xl">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Ready to start selling?</h2>
              <p className="text-white/60 text-lg mb-8">
                Try VEX for free. Upload your content and see what VEX can do for you.
              </p>
              <Link href="/signup">
                <Button size="lg" className="bg-white text-black hover:bg-gray-200 font-light rounded-full px-8 py-6 text-lg shadow-xl shadow-white/30 hover:shadow-2xl hover:shadow-white/40 transition-all">
                  Get Started For Free
                </Button>
              </Link>
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
