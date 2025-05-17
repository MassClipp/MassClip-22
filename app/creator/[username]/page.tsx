import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getCreatorProfile } from "@/app/actions/profile-actions"
import CreatorPageClient from "./CreatorPageClient"

interface CreatorPageProps {
  params: {
    username: string
  }
}

export async function generateMetadata({ params }: CreatorPageProps): Promise<Metadata> {
  const { username } = params
  const { profile } = await getCreatorProfile(username)

  if (!profile) {
    return {
      title: "Creator Not Found | Massclip",
      description: "The creator profile you are looking for does not exist.",
    }
  }

  return {
    title: `${profile.displayName} (@${profile.username}) | Massclip`,
    description: profile.bio || `Check out ${profile.displayName}'s clip packs on Massclip`,
    openGraph: {
      images: profile.profileImage ? [profile.profileImage] : [],
    },
  }
}

export default async function CreatorPage({ params }: CreatorPageProps) {
  const { username } = params
  const { profile } = await getCreatorProfile(username)

  if (!profile) {
    notFound()
  }

  return <CreatorPageClient params={params} />
}
