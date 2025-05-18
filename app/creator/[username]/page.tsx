import { notFound } from "next/navigation"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"
import { CreatorProfile } from "@/components/creator-profile"
import type { VimeoVideo } from "@/lib/types"

interface CreatorPageProps {
  params: {
    username: string
  }
}

export default async function CreatorPage({ params }: CreatorPageProps) {
  const { username } = params

  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    // Query for creator by username
    const creatorsRef = db.collection("creators")
    const snapshot = await creatorsRef.where("username", "==", username.toLowerCase()).limit(1).get()

    if (snapshot.empty) {
      return notFound()
    }

    // Get creator data
    const creatorDoc = snapshot.docs[0]
    const creatorData = creatorDoc.data()

    // Fetch free clips data
    let freeClips: VimeoVideo[] = []
    if (creatorData.freeClips && creatorData.freeClips.length > 0) {
      // If freeClips contains full video objects, use them directly
      if (typeof creatorData.freeClips[0] === "object" && creatorData.freeClips[0].uri) {
        freeClips = creatorData.freeClips
      } else {
        // Otherwise, fetch the videos from their IDs
        // This would need implementation based on how you store clip references
        // For now, we'll leave it as an empty array
      }
    }

    // Fetch paid clips data
    let paidClips: VimeoVideo[] = []
    if (creatorData.paidClips && creatorData.paidClips.length > 0) {
      // If paidClips contains full video objects, use them directly
      if (typeof creatorData.paidClips[0] === "object" && creatorData.paidClips[0].uri) {
        paidClips = creatorData.paidClips
      } else {
        // Otherwise, fetch the videos from their IDs
        // This would need implementation based on how you store clip references
        // For now, we'll leave it as an empty array
      }
    }

    // Prepare creator data for client component
    const creator = {
      uid: creatorData.uid,
      username: creatorData.username,
      displayName: creatorData.displayName || creatorData.username,
      bio: creatorData.bio || "",
      profilePic: creatorData.profilePic || "",
      freeClips,
      paidClips,
    }

    return (
      <main className="min-h-screen bg-zinc-950">
        <CreatorProfile creator={creator} />
      </main>
    )
  } catch (error) {
    console.error("Error fetching creator profile:", error)
    return notFound()
  }
}
