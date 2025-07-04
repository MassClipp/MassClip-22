"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { TrendingUp, Lock } from "lucide-react"
import { useUserPlan } from "@/hooks/use-user-plan"

interface Category {
  id: string
  name: string
  icon: React.ReactNode
  path: string
}

interface TrendingCategoriesSectionProps {
  categories: Category[]
}

export default function TrendingCategoriesSection({ categories }: TrendingCategoriesSectionProps) {
  const [sortedCategories, setSortedCategories] = useState<Category[]>([])
  const { isProUser } = useUserPlan()

  useEffect(() => {
    if (categories && categories.length > 0) {
      // For free users, sort alphabetically by name and limit to 5
      // For pro users, keep the original order (likely curated)
      if (!isProUser) {
        const sorted = [...categories].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 5)
        setSortedCategories(sorted)
      } else {
        setSortedCategories(categories)
      }
    }
  }, [categories, isProUser])

  return (
    <section className="mb-12">
      <div className="px-6 mb-4">
        <div className="flex items-center">
          <TrendingUp className="h-5 w-5 mr-2 text-crimson" />
          <h2 className="text-2xl font-extralight tracking-wider text-white">Trending Categories</h2>
        </div>
        {!isProUser && (
          <p className="text-sm text-gray-400 mt-1">
            Free users can access 5 of {categories.length} categories. Upgrade for full access.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 px-6">
        {sortedCategories.map((category, index) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Link href={category.path}>
              <div className="bg-zinc-900/50 hover:bg-zinc-800/50 border border-zinc-800/50 rounded-lg p-4 transition-all duration-300 h-full flex flex-col items-center justify-center text-center">
                <div className="mb-3 text-crimson">{category.icon}</div>
                <h3 className="text-white font-medium">{category.name}</h3>
              </div>
            </Link>
          </motion.div>
        ))}

        {/* Show locked categories for free users */}
        {!isProUser && categories.length > 5 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
          >
            <Link href="/pricing">
              <div className="bg-zinc-900/30 border border-crimson/20 rounded-lg p-4 transition-all duration-300 h-full flex flex-col items-center justify-center text-center">
                <div className="mb-3 text-crimson">
                  <Lock className="h-6 w-6" />
                </div>
                <h3 className="text-white font-medium">Unlock {categories.length - 5} More</h3>
                <p className="text-xs text-gray-400 mt-1">Upgrade to Pro</p>
              </div>
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  )
}
