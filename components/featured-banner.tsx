"use client"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import DecorativeBorder from "./decorative-border"

export default function FeaturedBanner() {
  const categoriesRef = useRef<HTMLDivElement>(null)

  const scrollToCategories = () => {
    if (categoriesRef.current) {
      categoriesRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <>
      <div className="relative w-full" style={{ height: "calc(100vh - 80px)" }}>
        {/* Video Background */}
        <div className="absolute inset-0 w-full h-full flex justify-center items-center bg-black">
          <div className="relative h-full" style={{ maxWidth: "56.25vh" }}>
            {/* 9:16 aspect ratio container for vertical video */}
            <div style={{ position: "relative", paddingBottom: "177.78%", height: 0, width: "100%" }}>
              <iframe
                src="https://player.vimeo.com/video/1075811596?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479&background=1&muted=1&autoplay=1&loop=1"
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                title="AZ Compass | All American Works"
              ></iframe>
            </div>
          </div>

          {/* Dark Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30"></div>
        </div>

        {/* Content Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 max-w-3xl">
            #1 Platform for Faceless Creators
          </h1>
          <p className="text-xl md:text-2xl text-white/80 mb-8 max-w-2xl">Your Time Matters. Let&apos;s Act Like It.</p>
          <Button onClick={scrollToCategories} className="bg-red-600 hover:bg-red-700 text-white px-8 py-6 text-lg">
            Enter the Vault
          </Button>
        </div>
      </div>
      <DecorativeBorder />
      <div ref={categoriesRef}></div>
    </>
  )
}
