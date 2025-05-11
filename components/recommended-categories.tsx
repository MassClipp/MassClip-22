import Link from "next/link"
import { Play } from "lucide-react"

interface CategoryItem {
  name: string
  slug: string
  description?: string
}

interface RecommendedCategoriesProps {
  categories: CategoryItem[]
}

export default function RecommendedCategories({ categories }: RecommendedCategoriesProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
      {categories.map((category) => (
        <Link
          key={category.slug}
          href={`/category/${category.slug}`}
          className="group relative overflow-hidden bg-zinc-900 border border-zinc-800 rounded-lg aspect-video flex items-center justify-center hover:border-crimson transition-colors"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent opacity-70"></div>
          <div className="relative z-10 text-center px-4">
            <h3 className="text-lg font-medium text-white mb-1 group-hover:text-crimson transition-colors">
              {category.name}
            </h3>
            {category.description && <p className="text-xs text-zinc-400 mb-2 line-clamp-2">{category.description}</p>}
            <div className="flex items-center justify-center text-zinc-500 text-xs">
              <Play className="h-3 w-3 mr-1" />
              <span>Explore</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
