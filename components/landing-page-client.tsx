"use client"

import LandingHeader from "./landing-header"
import { LandingVexInterface } from "./landing-vex-interface"
import { LandingBundlesDemo } from "./landing-bundles-demo"
import { LandingUploadDemo } from "./landing-upload-demo"
import { LandingVexDemo } from "./landing-vex-demo"
import Link from "next/link"
import { Button } from "./ui/button"

export function LandingPageClient() {
  return (
    <div className="min-h-screen bg-black">
      <LandingHeader />

      {/* Hero Section with VEX Interface */}
      <section className="pt-24 pb-16 px-4">
        <LandingVexInterface />
      </section>

      {/* VEX Demo Section */}
      <section className="py-16 px-4 border-t border-white/10">
        <LandingVexDemo />
      </section>

      {/* Upload Demo Section */}
      <section className="py-16 px-4 border-t border-white/10">
        <LandingUploadDemo />
      </section>

      {/* Bundles Demo Section */}
      <section className="py-16 px-4 border-t border-white/10">
        <LandingBundlesDemo />
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 border-t border-white/10 text-center">
        <div className="max-w-3xl mx-auto space-y-8">
          <h2 className="text-5xl font-thin text-white">Ready to Start Selling?</h2>
          <p className="text-white/60 font-light text-xl">
            Join creators who are already organizing and monetizing their content with VEX AI
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button className="bg-gradient-to-r from-teal-500 to-cyan-400 hover:from-teal-600 hover:to-cyan-500 text-white font-light px-12 py-6 text-lg rounded-full">
                Sign Up Free
              </Button>
            </Link>
            <Link href="/login">
              <Button
                variant="outline"
                className="border-white/20 text-white hover:bg-white/5 font-light px-12 py-6 text-lg rounded-full bg-transparent"
              >
                Log In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-white/40 text-sm font-light">© 2025 MassClip. All rights reserved.</p>
          <div className="flex items-center gap-8">
            <Link href="/about" className="text-white/60 hover:text-white text-sm font-light transition-colors">
              About
            </Link>
            <Link href="/privacy" className="text-white/60 hover:text-white text-sm font-light transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-white/60 hover:text-white text-sm font-light transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
