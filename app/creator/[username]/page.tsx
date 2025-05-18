import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getCreatorByUsername } from "@/lib/creator-utils"
import { CreatorProfile } from "@/components/creator-profile"

interface CreatorPageProps {
  params: {
    username: string
  }
}

// Generate metadata for the page
export async function generateMetadata({ params }: CreatorPageProps): Promise<Metadata> {
  const { username } = params

  try {
    const creator = await getCreatorByUsername(username)

    if (!creator) {
      return {
        title: "Creator Not Found | MassClip",
      }
    }

    return {
      title: `${creator.displayName} | MassClip`,
      description: creator.bio || `Check out ${creator.displayName}'s content on MassClip`,
    }
  } catch (error) {
    console.error("Error generating metadata:", error)
    return {
      title: "Creator | MassClip",
    }
  }
}

export default async function CreatorPage({ params }: CreatorPageProps) {
  const { username } = params

  try {
    const creator = await getCreatorByUsername(username)

    if (!creator) {
      notFound()
    }

    return (
      <main className="min-h-screen bg-black">
        <CreatorProfile creator={creator} />
      </main>
    )
  } catch (error) {
    console.error("Error fetching creator:", error)
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <h1 className="text-2xl text-white mb-4">Something went wrong</h1>
        <p className="text-gray-400">We couldn't load this creator's profile</p>
      </div>
    )
  }
}
