"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

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
      }
    } catch (error) {
      console.error("Error initiating checkout:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="py-24 px-6 border-t border-white/10 bg-black/50">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1">
            <div className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
              Need a Quick Content Boost?
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
              150+ High Quality Motivational Clips To Get Started
            </h2>
            <p className="text-white/60 text-lg leading-relaxed mb-8">
              Whether your starting your theme page today or just need a boost in content inventory, this pack gives you
              everything you need to post right now and/or to start selling on your storefront!
            </p>
            <Button
              onClick={handleBuyNow}
              disabled={isLoading}
              size="lg"
              className="bg-white text-black hover:bg-gray-200 font-medium rounded-full px-8 py-6 text-lg shadow-xl shadow-white/10 hover:shadow-white/20 transition-all w-full md:w-auto min-w-[200px]"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              Buy Now - $12
            </Button>
          </div>
          <div className="order-1 md:order-2 relative">
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-purple-500/10 mix-blend-overlay z-10" />
              {/* Placeholder for the thumbnail - user to provide */}
              <div className="w-full h-full flex items-center justify-center bg-neutral-900 text-neutral-500">
                <span className="text-sm">Product Thumbnail</span>
              </div>
              {/* 
                Once user provides image, replace the div above with:
                <Image 
                  src="/path/to/image.jpg" 
                  alt="Content Pack Thumbnail" 
                  fill 
                  className="object-cover select-none pointer-events-none" 
                  draggable={false}
                /> 
              */}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
