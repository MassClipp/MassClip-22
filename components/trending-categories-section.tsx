"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { TrendingUp, Brain, Zap } from "lucide-react"

interface Category {
  id: string
  name: string
  icon: React.ReactNode
  path: string
}

interface TrendingCategoriesSectionProps {
  categories: Category[]
}

// Temporarily filter to show only mindset and hustle categories
const ALLOWED_CATEGORIES = ["mindset", "hustle-mentality", "introspection"]

// Define the specific categories we want to show
const FILTERED_CATEGORIES: Category[] = [
  {
    id: "mindset",
    name: "Mindset",
    icon: <Brain className="h-6 w-6" />,
    path: "/category/introspection",
  },
  {
    id: "hustle",
    name: "Hustle",
    icon: <Zap className="h-6 w-6" />,
    path: "/category/hustle-mentality",
  },
]

export default function TrendingCategoriesSection({ categories }: TrendingCategoriesSectionProps) {
  const [sortedCategories, setSortedCategories] = useState<Category[]>([])

  useEffect(() => {
    // Temporarily show only mindset and hustle categories for all users
    setSortedCategories(FILTERED_CATEGORIES)
  }, [categories])

  return (
    <section className="mb-12">
      <div className="px-6 mb-4">
        <div className="flex items-center">
          <TrendingUp className="h-5 w-5 mr-2 text-crimson" />
          <h2 className="text-2xl font-extralight tracking-wider text-white">Trending Categories</h2>
        </div>
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
      </div>
    </section>
  )
}
