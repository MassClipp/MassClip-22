"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useEffect } from "react"
import { LandingVexInterface } from "@/components/landing-vex-interface"

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
    <div className="min-h-screen bg-black flex flex-col">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <nav className="flex items-center justify-between max-w-7xl mx-auto px-6 py-4">
          <div className="text-white font-light text-2xl">
            <span className="font-league-spartan font-bold" style={{ fontFamily: "var(--font-league-spartan)" }}>
              Vex
            </span>
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

      <main className="flex-1 flex flex-col">
        <LandingVexInterface />
      </main>

      <footer className="border-t border-white/10 py-6">
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
