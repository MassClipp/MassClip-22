"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { useVimeoShowcases } from "@/hooks/use-vimeo-showcases"
import { ArrowUpRight } from "lucide-react"

interface MinimalCategoryListProps {
  categories: string[]
  showcaseIds?: Record<string, string>
}

export default function MinimalCategoryList({ categories, showcaseIds = {} }: MinimalCategoryListProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const { categoryToShowcaseMap } = useVimeoShowcases()

  // Helper function to normalize category names - memoized to prevent recreation
  const normalizeCategory = useMemo(
    () =>
      (category: string): string => {
        return category.trim().toLowerCase().replace(/\s+/g, " ")
      },
    [],
  )

  // Memoize the getCategoryLink function to prevent recreation on every render
  const getCategoryLink = useMemo(
    () =>
      (category: string): string => {
        // Special case for "Browse All"
        if (normalizeCategory(category) === "browse all") {
          return "/category/browse-all"
        }

        // Map Introspection to Mindset for URL purposes
        if (normalizeCategory(category) === "introspection") {
          return "/category/mindset"
        }

        // Check if we have a direct showcase mapping in showcaseIds
        const directShowcaseId = Object.entries(showcaseIds).find(
          ([name]) => normalizeCategory(name) === normalizeCategory(category),
        )?.[1]

        if (directShowcaseId) {
          return `/showcase/${directShowcaseId}`
        }

        // Check if we have a mapping in categoryToShowcaseMap
        const mappedShowcaseName = Object.entries(categoryToShowcaseMap || {}).find(
          ([mappedCategory]) => normalizeCategory(mappedCategory) === normalizeCategory(category),
        )?.[1]

        if (mappedShowcaseName && showcaseIds[mappedShowcaseName]) {
          return `/showcase/${showcaseIds[mappedShowcaseName]}`
        }

        // Fallback to category slug
        const categorySlug = category.toLowerCase().replace(/\s+/g, "-")
        return `/category/${categorySlug}`
      },
    [showcaseIds, categoryToShowcaseMap, normalizeCategory],
  )

  // Function to display the category name, mapping Introspection to Mindset
  const displayCategoryName = (category: string) => {
    return category.toLowerCase() === "introspection" ? "Mindset" : category
  }

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <motion.div className="w-full max-w-md mx-auto" variants={container} initial="hidden" animate="show">
      <ul className="space-y-6">
        {categories.map((category, index) => (
          <motion.li
            key={category}
            variants={item}
            className="relative"
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {/* Use Link component for direct navigation */}
            <Link
              href={getCategoryLink(category)}
              className="block w-full text-left py-3 px-1 group transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <span className="inline-block font-extralight text-2xl tracking-wide text-gray-300 group-hover:text-white transition-colors duration-300">
                  {displayCategoryName(category)}
                </span>

                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: hoveredIndex === index ? 1 : 0, x: hoveredIndex === index ? 0 : -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <ArrowUpRight className="h-5 w-5 text-red-500" />
                </motion.div>
              </div>

              {/* Animated line that appears on hover */}
              <motion.div
                className="absolute left-0 bottom-0 h-[0.5px] bg-gray-500"
                initial={{ width: "0%" }}
                animate={{ width: hoveredIndex === index ? "100%" : "0%" }}
                transition={{ duration: 0.3 }}
              />
            </Link>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  )
}
