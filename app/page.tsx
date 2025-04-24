"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import LandingHeader from "@/components/landing-header"

export default function LandingPage() {
  const router = useRouter()
  const [transitionState, setTransitionState] = useState<"idle" | "pulling" | "loading" | "complete">("idle")

  // Handle the transition sequence
  const handleEnterVault = () => {
    // Step 1: Start the pull-in animation
    setTransitionState("pulling")

    // Step 2: Show loading screen after animation completes
    setTimeout(() => {
      setTransitionState("loading")

      // Step 3: Navigate to dashboard
      setTimeout(() => {
        router.push("/dashboard")
      }, 300) // Short delay before navigation
    }, 1000) // Animation duration
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Static Gradient Background */}
      <div className="fixed inset-0 z-0 static-gradient-bg"></div>

      {/* Landing Page Content */}
      <div
        className={`relative z-20 min-h-screen flex flex-col ${
          transitionState !== "idle" ? "pointer-events-none" : ""
        } ${transitionState === "pulling" ? "pull-in-effect" : ""}`}
      >
        <LandingHeader />

        {/* Hero Content */}
        <div className="relative flex-1 flex items-center justify-center">
          <div
            className={`relative z-20 text-center px-4 max-w-4xl mx-auto transition-opacity duration-500 ${
              transitionState === "pulling" ? "opacity-0" : "opacity-100"
            }`}
          >
            <h1 className="text-3xl md:text-5xl font-light tracking-tight text-white mb-4">
              #1 Platform for Faceless Creators
            </h1>
            <p className="text-lg md:text-xl font-extralight text-gray-200 mb-8">
              Your time matters. Let&apos;s act like it.
            </p>
            <button onClick={handleEnterVault} className="vault-button inline-block">
              <span className="relative block px-8 py-3 text-white font-light border border-white transition-colors duration-300">
                Enter the Vault
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Black loading screen */}
      {(transitionState === "loading" || transitionState === "complete") && (
        <div className="fixed inset-0 z-50 bg-black"></div>
      )}
    </div>
  )
}
