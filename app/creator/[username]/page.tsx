import { notFound } from "next/navigation"
import { Suspense } from "react"
import CreatorProfile from "@/components/creator-profile-minimal"
import PremiumContentSection from "@/components/premium-content-section"
import { Skeleton } from "@/components/ui/skeleton"

interface CreatorPageProps {
  params: {
    username: string
  }
}

async function getCreatorData(username: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/uploads/by-username/${username}`, {
      cache: "no-store",
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`Failed to fetch creator data: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error fetching creator data:", error)
    return null
  }
}

export default async function CreatorPage({ params }: CreatorPageProps) {
  const { username } = params
  const creatorData = await getCreatorData(username)

  if (!creatorData) {
    notFound()
  }

  const { creator, uploads } = creatorData

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Creator Profile */}
          <CreatorProfile creator={creator} uploads={uploads} isOwner={false} />

          {/* Premium Content Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Premium Content</h2>
            </div>

            <Suspense fallback={<PremiumContentSkeleton />}>
              <PremiumContentSection creatorId={creator.uid} creatorUsername={creator.username} isOwner={false} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}

function PremiumContentSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-4">
          <Skeleton className="aspect-square w-full bg-zinc-800" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4 bg-zinc-800" />
            <Skeleton className="h-3 w-1/2 bg-zinc-800" />
          </div>
        </div>
      ))}
    </div>
  )
}
