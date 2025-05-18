import { notFound } from "next/navigation"
import { db } from "@/lib/firebase-admin"
import CreatorProfileClient from "./creator-profile-client"

interface CreatorProfilePageProps {
  params: {
    username: string
  }
}

export default async function CreatorProfilePage({ params }: CreatorProfilePageProps) {
  const { username } = params

  try {
    // Find the profile by username
    const usernameDoc = await db.collection("usernames").doc(username).get()

    if (!usernameDoc.exists) {
      return notFound()
    }

    const uid = usernameDoc.data()?.uid

    if (!uid) {
      return notFound()
    }

    // Get the creator profile
    const profileDoc = await db.collection("creatorProfiles").doc(uid).get()

    if (!profileDoc.exists) {
      return notFound()
    }

    const profile = {
      id: profileDoc.id,
      ...profileDoc.data(),
    }

    // For now, we'll use empty arrays for clips
    // In a real implementation, you would fetch the clips from your database
    const freeClips = []
    const paidClips = []

    return <CreatorProfileClient profile={profile} freeClips={freeClips} paidClips={paidClips} />
  } catch (error) {
    console.error("Error fetching creator profile:", error)
    return notFound()
  }
}
