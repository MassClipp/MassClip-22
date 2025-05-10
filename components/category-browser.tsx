import Link from "next/link"
import { useCategoriesWithCounts } from "@/hooks/use-categories"

export default function CategoryBrowser() {
  const { categories, loading, error } = useCategoriesWithCounts()

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={`skeleton-${index}`} className="aspect-video bg-zinc-900/50 animate-pulse rounded-xl" />
        ))}
      </div>
    )
  }

  if (error) {
    return <div className="p-4 bg-red-500/10 rounded-lg text-red-500">Error loading categories: {error.message}</div>
  }

  if (categories.length === 0) {
    return <div className="text-center py-8 text-zinc-500">No categories available.</div>
  }

  // Sort categories by video count (most videos first)
  const sortedCategories = [...categories].sort((a, b) => b.videoCount - a.videoCount)

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Browse Categories</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {sortedCategories.map((category) => (
          <Link
            key={category.id}
            href={`/category/${category.slug}`}
            className="group relative aspect-video bg-zinc-900/50 rounded-xl overflow-hidden hover:bg-zinc-800/50 transition-all duration-300"
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-4">
                <h3 className="font-medium text-white group-hover:text-crimson transition-colors">{category.name}</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  {category.videoCount} {category.videoCount === 1 ? "video" : "videos"}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
