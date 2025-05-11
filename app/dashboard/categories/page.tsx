"use client"

import { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import DashboardHeader from "@/components/dashboard-header"
import MinimalCategoryList from "@/components/minimal-category-list"
import { useVimeoShowcases } from "@/hooks/use-vimeo-showcases"
import { Search } from "lucide-react"

export default function CategoriesPage() {
  const { showcases, showcaseIds, loading: loadingShowcases } = useVimeoShowcases()
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredCategories, setFilteredCategories] = useState<string[]>([])

  // Define the exact categories we want to display
  const specificCategories = useMemo(
    () => [
      "Browse All",
      "Introspection",
      "Hustle Mentality",
      "High Energy Motivation",
      "Faith",
      "Money & Wealth",
      "Motivational Speeches",
    ],
    [],
  )

  useEffect(() => {
    if (loadingShowcases) {
      return
    }

    // Use our specific categories
    setCategories(specificCategories)
    setFilteredCategories(specificCategories)
    setLoading(false)
  }, [loadingShowcases, specificCategories])

  // Filter categories based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredCategories(categories)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = categories.filter((category) => category.toLowerCase().includes(query))
      setFilteredCategories(filtered)
    }
  }, [searchQuery, categories])

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Premium Gradient Background */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-black via-black to-gray-900"></div>

      <DashboardHeader />

      <main className="pt-20 pb-16 relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.h1
            className="text-4xl font-extralight tracking-wider text-center mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            Categories
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="relative mb-8"
          >
            <input
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-900/80 border border-gray-800 rounded-lg py-3 px-4 pl-10 text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          </motion.div>

          {loading ? (
            <motion.div className="text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="w-8 h-8 border-t-2 border-red-500 border-solid rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400 font-extralight">Loading categories...</p>
            </motion.div>
          ) : filteredCategories.length > 0 ? (
            <motion.div variants={container} initial="hidden" animate="show">
              <p className="text-center text-gray-400 mb-8">{filteredCategories.length} categories available</p>
              <MinimalCategoryList categories={filteredCategories} showcaseIds={showcaseIds} />
            </motion.div>
          ) : (
            <motion.div className="text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="text-gray-400 font-extralight">No categories found matching "{searchQuery}".</p>
              <button
                onClick={() => setSearchQuery("")}
                className="mt-4 text-red-500 hover:text-red-400 transition-colors"
              >
                Clear search
              </button>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  )
}
