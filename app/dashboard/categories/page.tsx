"use client"

import { useState, useEffect, useMemo } from "react"
import DashboardHeader from "@/components/dashboard-header"
import MinimalCategoryList from "@/components/minimal-category-list"
import { useVimeoShowcases } from "@/hooks/use-vimeo-showcases"
import { motion } from "framer-motion"

export default function CategoriesPage() {
  const { showcases, showcaseIds, loading: loadingShowcases } = useVimeoShowcases()
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

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
    setLoading(false)
  }, [loadingShowcases, specificCategories])

  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Static Gradient Background */}
      <div className="fixed inset-0 z-0 static-gradient-bg"></div>

      <DashboardHeader />

      <main className="pt-20 pb-16 relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-extralight tracking-wider text-center mb-16">Categories</h1>

          {loading ? (
            <div className="text-center">
              <p className="text-gray-400 font-extralight">Loading categories...</p>
            </div>
          ) : categories.length > 0 ? (
            <>
              <p className="text-center text-gray-400 mb-8">{categories.length} categories available</p>
              <MinimalCategoryList categories={categories} showcaseIds={showcaseIds} />
            </>
          ) : (
            <div className="text-center">
              <p className="text-gray-400 font-extralight">No categories found.</p>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}
