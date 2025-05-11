import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getShowcaseIdForCategory } from "@/lib/showcase-category-mapping"
import { fetchVimeoShowcaseVideos } from "@/lib/vimeo-helpers"
import { VimeoCard } from "@/components/vimeo-card"

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

  // Get the showcase ID for this category
  const showcaseId = getShowcaseIdForCategory(categoryId)

  if (!showcaseId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">{categoryId}</h1>
        <p className="text-zinc-400">No showcase found for this category.</p>
      </div>
    )
  }

  // Fetch videos from the showcase
  const videos = await fetchVimeoShowcaseVideos(showcaseId)

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">{categoryId}</h1>

      <Suspense fallback={<div>Loading videos...</div>}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {videos.map((video: any) => (
            <VimeoCard key={video.uri} video={video} />
          ))}

          {videos.length === 0 && (
            <div className="col-span-full text-center py-8 text-zinc-500">No videos found in this category.</div>
          )}
        </div>
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

  return {
    title: `${categoryId} Videos | MassClip`,
    description: `Browse our collection of ${categoryId.toLowerCase()} videos.`,
  }
}
