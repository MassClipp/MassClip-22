import { Suspense } from "react"
import { notFound } from "next/navigation"
import CategoryVideoGrid from "@/components/category-video-grid"
import { getCategoryById } from "@/lib/category-system/category-db"

// Map URL-friendly slugs to category IDs
const slugToCategoryMap: Record<string, string> = {
  "hustle-mentality": "hustle-mentality",
  "money-and-wealth": "money-and-wealth",
  introspection: "introspection",
  faith: "faith",
  "high-energy-motivation": "high-energy-motivation",
  "motivational-speeches": "motivational-speeches",
}

export default async function CategoryPage({ params }: { params: { tag: string } }) {
  const { tag } = params

  // Get the category ID from the slug
  const categoryId = slugToCategoryMap[tag]

  if (!categoryId) {
    return notFound()
  }

  // Get the category details
  const category = await getCategoryById(categoryId)

  if (!category || !category.isActive) {
    return notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">{category.name}</h1>

      {category.description && <p className="text-zinc-400 mb-8">{category.description}</p>}

      <Suspense fallback={<div>Loading videos...</div>}>
        <CategoryVideoGrid categoryId={categoryId} limit={24} />
      </Suspense>
    </div>
  )
}

// Generate metadata for the page
export async function generateMetadata({ params }: { params: { tag: string } }) {
  const { tag } = params
  const categoryId = slugToCategoryMap[tag]

  if (!categoryId) {
    return {
      title: "Category Not Found",
      description: "The requested category does not exist.",
    }
  }

  const category = await getCategoryById(categoryId)

  if (!category) {
    return {
      title: "Category Not Found",
      description: "The requested category does not exist.",
    }
  }

  return {
    title: `${category.name} Videos | MassClip`,
    description: category.description || `Browse our collection of ${category.name.toLowerCase()} videos.`,
  }
}
