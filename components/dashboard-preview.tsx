"use client"

import { useEffect, useState } from "react"
import DashboardHeader from "@/components/dashboard-header"
import VideoRow from "@/components/video-row"
import { categories } from "@/lib/data"

export default function DashboardPreview() {
  // Use state to control the fade-in animation
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Slight delay before fading in the dashboard
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 200)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className={`min-h-screen bg-black text-white transition-opacity duration-500 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <DashboardHeader />

      <main className="pt-20 pb-16">
        {/* Hero Section */}
        <section className="px-6 mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Welcome to Your Vault</h1>
          <p className="text-gray-400">Access premium clips to accelerate your content creation</p>
        </section>

        {/* Video Categories */}
        <div className="space-y-10 px-2">
          {categories.slice(0, 2).map((category) => (
            <VideoRow key={category.id} title={category.name} videos={category.videos.slice(0, 4)} />
          ))}
        </div>
      </main>
    </div>
  )
}
