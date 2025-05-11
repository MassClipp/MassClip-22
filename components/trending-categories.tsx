import type React from "react"
import Link from "next/link"
import { Circle, Zap, Clock, Grid } from "lucide-react"

interface CategoryItem {
  name: string
  slug: string
  icon: React.ReactNode
}

interface TrendingCategoriesProps {
  categories?: CategoryItem[]
}

export default function TrendingCategories({ categories }: TrendingCategoriesProps) {
  // Default categories if none provided
  const defaultCategories: CategoryItem[] = [
    {
      name: "Introspection",
      slug: "introspection",
      icon: <Circle className="h-4 w-4 text-red-500" />,
    },
    {
      name: "Hustle",
      slug: "hustle-mentality",
      icon: <Zap className="h-4 w-4 text-amber-500" />,
    },
    {
      name: "Recent",
      slug: "recently-added",
      icon: <Clock className="h-4 w-4 text-green-500" />,
    },
    {
      name: "All",
      slug: "browse-all",
      icon: <Grid className="h-4 w-4 text-blue-500" />,
    },
  ]

  const displayCategories = categories || defaultCategories

  return (
    <div className="grid grid-cols-4 gap-3 mb-8">
      {displayCategories.map((category) => (
        <Link
          key={category.slug}
          href={`/category/${category.slug}`}
          className="bg-zinc-900/80 border border-zinc-800 rounded-md py-3 px-4 flex items-center hover:bg-zinc-800/80 transition-colors"
        >
          <span className="mr-2">{category.icon}</span>
          <span className="text-sm text-white">{category.name}</span>
        </Link>
      ))}
    </div>
  )
}
