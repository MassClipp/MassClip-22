import { useCategories } from "@/hooks/use-categories"
import CategoryVideoGrid from "./category-video-grid"

interface CategoryFeedProps {
  limit?: number
  excludeEmpty?: boolean
}

export default function CategoryFeed({ limit = 6, excludeEmpty = true }: CategoryFeedProps) {
  const { categories, loading, error } = useCategories()

  if (loading) {
    return (
      <div className="space-y-12">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={`skeleton-${index}`} className="space-y-4">
            <div className="h-8 w-48 bg-zinc-900/50 animate-pulse rounded-md" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={`video-skeleton-${idx}`} className="aspect-[9/16] bg-zinc-900/50 animate-pulse rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return <div className="p-4 bg-red-500/10 rounded-lg text-red-500">Error loading categories: {error.message}</div>
  }

  return (
    <div className="space-y-12">
      {categories.map((category) => (
        <div key={category.id} className="category-section">
          <CategoryVideoGrid categoryId={category.id} title={category.name} limit={limit} className="mb-4" />

          <div className="flex justify-end">
            <a
              href={`/category/${category.slug}`}
              className="text-sm text-crimson hover:text-crimson-dark transition-colors"
            >
              View all {category.name} videos →
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}
