"use client"

import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { Brain, Dumbbell, Flame, Heart, Search, Sparkles, Film } from "lucide-react"

interface MinimalCategoryListProps {
  categories: string[]
  showcaseIds?: Record<string, string>
}

export default function MinimalCategoryList({ categories, showcaseIds = {} }: MinimalCategoryListProps) {
  const router = useRouter()

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "browse all":
        return <Search className="w-5 h-5 text-gray-400" />
      case "mindset":
      case "introspection":
        return <Brain className="w-5 h-5 text-blue-400" />
      case "hustle mentality":
        return <Flame className="w-5 h-5 text-orange-400" />
      case "high energy motivation":
        return <Dumbbell className="w-5 h-5 text-red-400" />
      case "faith":
        return <Heart className="w-5 h-5 text-purple-400" />
      case "cinema":
        return <Film className="w-5 h-5 text-green-400" />
      default:
        return <Sparkles className="w-5 h-5 text-yellow-400" />
    }
  }

  const handleCategoryClick = (category: string) => {
    // Map Introspection to Mindset for URL purposes
    const categoryForUrl = category.toLowerCase() === "introspection" ? "mindset" : category.toLowerCase()

    if (category.toLowerCase() === "browse all") {
      router.push("/category/browse-all")
    } else {
      router.push(`/category/${categoryForUrl.toLowerCase().replace(/\s+/g, "-")}`)
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  // Function to display the category name, mapping Introspection to Mindset
  const displayCategoryName = (category: string) => {
    return category.toLowerCase() === "introspection" ? "Mindset" : category
  }

  return (
    <div className="space-y-2">
      {categories.map((category) => (
        <motion.div
          key={category}
          variants={item}
          className="bg-gray-900/60 border border-gray-800 rounded-lg p-4 flex items-center justify-between cursor-pointer hover:bg-gray-800/60 transition-colors"
          onClick={() => handleCategoryClick(category)}
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gray-800 rounded-full">{getCategoryIcon(category)}</div>
            <span className="text-white font-light">{displayCategoryName(category)}</span>
          </div>
          <div className="text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
