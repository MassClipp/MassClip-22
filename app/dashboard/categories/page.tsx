"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import DashboardHeader from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

// Define our categories
const CATEGORIES = [
  {
    slug: "hustle-mentality",
    title: "Hustle Mentality",
    description: "Motivational content focused on hustle, grind, and achieving success through hard work.",
    image: "/abstract-geometric-transition.png",
  },
  {
    slug: "money-and-wealth",
    title: "Money & Wealth",
    description: "Financial wisdom, wealth building strategies, and money mindset content.",
    image: "/dynamic-zoom-thumbnail.png",
  },
  {
    slug: "introspection",
    title: "Introspection",
    description: "Content focused on self-reflection, personal growth, and inner development.",
    image: "/abstract-zoom-blur.png",
  },
  {
    slug: "faith",
    title: "Faith",
    description: "Spiritual and faith-based motivational content for inspiration and guidance.",
    image: "/abstract-glitch-thumbnail.png",
  },
  {
    slug: "high-energy-motivation",
    title: "High Energy Motivation",
    description: "Energetic and powerful motivational content to boost your drive and ambition.",
    image: "/digital-distortion.png",
  },
  {
    slug: "motivational-speeches",
    title: "Motivational Speeches",
    description: "Powerful speeches and talks from influential speakers and thought leaders.",
    image: "/diagonal-wipe-transition.png",
  },
  {
    slug: "recently-added",
    title: "Recently Added",
    description: "The latest content added to our platform, across all categories.",
    image: "/molecular-spin-change.png",
  },
  {
    slug: "browse-all",
    title: "Browse All",
    description: "Explore our entire collection of premium motivational content.",
    image: "/presentation-slide-transition.png",
  },
]

export default function CategoriesPage() {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)

  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Premium Gradient Background */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-black via-black to-gray-900"></div>

      <DashboardHeader />

      <main className="pt-20 pb-16 relative z-10">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Categories</h1>
            <p className="text-gray-400">Browse our premium content by category</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {CATEGORIES.map((category) => (
              <motion.div
                key={category.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                onMouseEnter={() => setHoveredCategory(category.slug)}
                onMouseLeave={() => setHoveredCategory(null)}
                className="relative group"
              >
                <Link href={`/category/${category.slug}`} className="block">
                  <div className="relative rounded-xl overflow-hidden aspect-[4/3]">
                    {/* Background Image */}
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-in-out group-hover:scale-110"
                      style={{ backgroundImage: `url(${category.image})` }}
                    ></div>

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition-colors duration-300"></div>

                    {/* Content */}
                    <div className="absolute inset-0 p-6 flex flex-col justify-between">
                      <h2 className="text-xl font-bold text-white">{category.title}</h2>

                      <div className="mt-auto">
                        <p className="text-sm text-gray-300 mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          {category.description}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-black/50 border-white/30 text-white hover:bg-white hover:text-black transition-colors"
                        >
                          Browse <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
