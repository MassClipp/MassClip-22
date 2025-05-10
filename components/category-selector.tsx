"use client"

import { useCategories } from "@/hooks/use-categories"
import { useEffect } from "react"

interface CategorySelectorProps {
  value: string
  onChange: (value: string) => void
  required?: boolean
  className?: string
  label?: string
  helpText?: string
}

export default function CategorySelector({
  value,
  onChange,
  required = false,
  className = "",
  label = "Category",
  helpText = "Select a category for your content",
}: CategorySelectorProps) {
  const { categories, loading, error } = useCategories()

  // Debug logging
  useEffect(() => {
    console.log("CategorySelector - Categories:", categories)
    console.log("CategorySelector - Loading:", loading)
    console.log("CategorySelector - Error:", error)
  }, [categories, loading, error])

  // Fallback categories in case Firestore fails
  const fallbackCategories = [
    { id: "hustle-mentality", name: "Hustle Mentality" },
    { id: "money-and-wealth", name: "Money & Wealth" },
    { id: "introspection", name: "Introspection" },
    { id: "faith", name: "Faith" },
    { id: "high-energy-motivation", name: "High Energy Motivation" },
    { id: "motivational-speeches", name: "Motivational Speeches" },
    { id: "fitness", name: "Fitness" },
    { id: "business", name: "Business" },
    { id: "lifestyle", name: "Lifestyle" },
  ]

  // Use fallback categories if there's an error or no categories loaded
  const displayCategories = categories.length > 0 ? categories : fallbackCategories

  return (
    <div className={className}>
      <label htmlFor="category" className="block text-sm font-medium text-zinc-400 mb-2">
        {label} {required && <span className="text-crimson">*</span>}
      </label>

      <select
        id="category"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-crimson/50 focus:border-transparent transition-all appearance-none"
        required={required}
        disabled={loading}
      >
        <option value="" disabled>
          {loading ? "Loading categories..." : "Select a category for your content"}
        </option>

        {displayCategories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>

      {error ? (
        <p className="text-xs text-red-500 mt-2">Error loading categories: {error.message}</p>
      ) : (
        <p className="text-xs text-zinc-500 mt-2">{helpText}</p>
      )}
    </div>
  )
}
