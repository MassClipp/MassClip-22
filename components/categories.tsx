"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface Category {
  id: string
  name: string
  count?: number
}

interface CategoriesProps {
  categories?: Category[]
  selectedCategory?: string
  onCategorySelect?: (categoryId: string) => void
  className?: string
}

const defaultCategories: Category[] = [
  { id: "all", name: "All", count: 0 },
  { id: "cinema", name: "Cinema", count: 0 },
  { id: "hustle-mentality", name: "Hustle Mentality", count: 0 },
  { id: "introspection", name: "Introspection", count: 0 },
  { id: "recently-added", name: "Recently Added", count: 0 },
  { id: "creator-uploads", name: "Creator Uploads", count: 0 },
]

export function Categories({
  categories = defaultCategories,
  selectedCategory = "all",
  onCategorySelect,
  className = "",
}: CategoriesProps) {
  const [activeCategory, setActiveCategory] = useState(selectedCategory)

  const handleCategoryClick = (categoryId: string) => {
    setActiveCategory(categoryId)
    onCategorySelect?.(categoryId)
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {categories.map((category) => (
        <Button
          key={category.id}
          variant={activeCategory === category.id ? "default" : "outline"}
          size="sm"
          onClick={() => handleCategoryClick(category.id)}
          className="flex items-center gap-2"
        >
          {category.name}
          {category.count !== undefined && category.count > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs">
              {category.count}
            </Badge>
          )}
        </Button>
      ))}
    </div>
  )
}

export default Categories
