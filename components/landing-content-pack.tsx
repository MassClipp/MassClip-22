"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Loader2, Mail, Tag } from "lucide-react"
import { toast } from "sonner"

export function LandingContentPack() {
  const [isLoading, setIsLoading] = useState(false)

  const handleBuyNow = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/stripe/checkout/content-pack", {
        method: "POST",
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error("No checkout URL returned")
      }
    } catch (error) {
      console.error("Checkout error:", error)
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="py-24 px-6 border-t border-white/10 bg-black/50 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Image Side */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
            <div className="relative bg-black border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src="/images/150-clips.png"
                alt="150+ High Quality Motivational Clips"
                width={800}
                height={800}
                className="w-full h-auto object-cover select-none"
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                quality={90}
              />
            </div>
          </div>

          {/* Content Side */}
          <div className="space-y-8">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white text-sm font-medium">
                <Mail className="w-4 h-4" />
                <span>Email Delivery</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white">Need a Quick Content Boost?</h2>
            </div>

            <div className="space-y-4">
              <h3 className="text-2xl font-semibold text-white/90">
                150+ High Quality Motivational Clips To Get Started
              </h3>
              <p className="text-white/60 text-lg leading-relaxed">
                Whether your starting your theme page today or just need a boost in content inventory, this pack gives
                you everything you need to post right now and/or to start selling on your storefront!
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
              <Tag className="w-4 h-4" />
              <span>Use promo code at checkout for discount</span>
            </div>

            <div className="flex items-center gap-6 pt-4">
              <Button
                onClick={handleBuyNow}
                disabled={isLoading}
                size="lg"
                className="bg-white text-black hover:bg-gray-200 font-semibold rounded-full px-8 py-6 text-lg shadow-xl shadow-white/10 hover:shadow-white/20 transition-all min-w-[160px]"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Buy Now <span className="opacity-40">|</span> $12
                  </span>
                )}
              </Button>
              <div className="text-sm text-white/40">
                <p>Secure payment via Stripe</p>
                <p>Instant email delivery</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
