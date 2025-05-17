import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getCreatorProfile } from "@/app/actions/profile-actions"
import CreatorProfileClient from "./creator-profile-client"

interface CreatorProfilePageProps {
  params: {
    username: string
  }
}

export async function generateMetadata({ params }: CreatorProfilePageProps): Promise<Metadata> {
  const { username } = params
  const { profile } = await getCreatorProfile(username)

  if (!profile) {
    return {
      title: "Creator Not Found | MassClip",
      description: "The creator profile you are looking for does not exist.",
    }
  }

  return {
    title: `${profile.displayName} (@${profile.username}) | MassClip`,
    description: profile.bio || `Check out ${profile.displayName}'s clips on MassClip`,
    openGraph: {
      images: profile.profileImage ? [profile.profileImage] : [],
    },
  }
}

export default async function CreatorProfilePage({ params }: CreatorProfilePageProps) {
  const { username } = params
  const { profile } = await getCreatorProfile(username)

  if (!profile) {
    notFound()
  }

  return <CreatorProfileClient profile={profile} />
}
