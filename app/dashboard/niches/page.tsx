"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Search, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import DashboardHeader from "@/components/dashboard-header"
import { NICHE_CATEGORIES } from "@/lib/category-constants"
import { useVimeoVideos } from "@/hooks/use-vimeo-videos"

export default function NichesPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredCategories, setFilteredCategories] = useState(NICHE_CATEGORIES)
  const { videosByTag, loading } = useVimeoVideos()
  const [categoryVideoCounts, setCategoryVideoCounts] = useState<Record<string, number>>({})

  // Filter categories based on search
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredCategories(NICHE_CATEGORIES)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = NICHE_CATEGORIES.filter((category) => category.label.toLowerCase().includes(query))
      setFilteredCategories(filtered)
    }
  }, [searchQuery])

  // Count videos in each category
  useEffect(() => {
    if (!loading && videosByTag) {
      const counts: Record<string, number> = {}

      // Count videos for each category
      NICHE_CATEGORIES.forEach((category) => {
        const tagName = category.id.toLowerCase()
        counts[category.id] = videosByTag[tagName]?.length || 0
      })

      setCategoryVideoCounts(counts)
    }
  }, [videosByTag, loading])

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.4,
      },
    },
  }

  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Premium Gradient Background */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-black via-black to-gray-900"></div>

      <DashboardHeader />

      <main className="pt-20 pb-16 relative z-10">
        <div className="container mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 mb-2">
              Browse Categories
            </h1>
            <p className="text-gray-400">
              Discover content organized by categories to find exactly what you're looking for
            </p>
          </div>

          {/* Search */}
          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-900/80 border border-gray-800 rounded-lg py-3 px-10 text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Categories Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-900/50 border border-gray-800 rounded-xl h-40 animate-pulse"></div>
              ))}
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">No categories found matching "{searchQuery}"</p>
              <Button onClick={() => setSearchQuery("")} variant="outline" className="border-gray-700">
                Clear Search
              </Button>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredCategories.map((category) => (
                <motion.div key={category.id} variants={itemVariants}>
                  <Link href={`/category/${category.id}`}>
                    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 h-full hover:bg-gray-900/80 hover:border-gray-700 transition-all duration-300 group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-xl font-bold group-hover:bg-red-900/20 transition-colors">
                          {category.label.charAt(0)}
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                      </div>
                      <h3 className="text-xl font-medium mb-2 group-hover:text-red-400 transition-colors">
                        {category.label}
                      </h3>
                      <p className="text-sm text-gray-400">{categoryVideoCounts[category.id] || 0} videos</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </main>
    </div>
  )
}
