import { Suspense } from "react"
import { notFound } from "next/navigation"
import CategoryVideoGrid from "@/components/category-video-grid"

// Map URL-friendly tags to display names
const categoryMap: Record<string, string> = {
  "hustle-mentality": "Hustle Mentality",
  "money-and-wealth": "Money & Wealth",
  introspection: "Introspection",
  faith: "Faith",
  "high-energy-motivation": "High Energy Motivation",
  "motivational-speeches": "Motivational Speeches",
}

export default function CategoryPage({
  params,
  searchParams,
}: { params: { tag: string }; searchParams: { showcaseId?: string } }) {
  const { tag } = params

  // Get the showcaseId from the searchParams
  const showcaseId = searchParams.showcaseId || params.tag

  // Check if the category exists
  if (!categoryMap[tag]) {
    return notFound()
  }

  const categoryTitle = categoryMap[tag]

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">{categoryTitle}</h1>

      <Suspense fallback={<div>Loading videos...</div>}>
        <CategoryVideoGrid category={showcaseId} limit={24} />
      </Suspense>
    </div>
  )
}

// Generate metadata for the page
export function generateMetadata({ params }: { params: { tag: string } }) {
  const { tag } = params
  const categoryTitle = categoryMap[tag] || "Category"

  return {
    title: `${categoryTitle} Videos | MassClip`,
    description: `Browse our collection of ${categoryTitle.toLowerCase()} videos.`,
  }
}
