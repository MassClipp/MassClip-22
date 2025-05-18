import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import CreatorProfile from "@/components/creator-profile"

// Generate metadata for the page
export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  const { username } = params

  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    // Query for creator by username
    const creatorsRef = db.collection("creators")
    const snapshot = await creatorsRef.where("username", "==", username).limit(1).get()

    if (snapshot.empty) {
      return {
        title: "Creator Not Found | MassClip",
      }
    }

    const creatorData = snapshot.docs[0].data()

    return {
      title: `${creatorData.displayName || username} | MassClip`,
      description: creatorData.bio || `Check out ${creatorData.displayName || username}'s content on MassClip`,
    }
  } catch (error) {
    console.error("Error fetching creator data for metadata:", error)
    return {
      title: "Creator Profile | MassClip",
    }
  }
}

export default async function CreatorProfilePage({ params }: { params: { username: string } }) {
  const { username } = params

  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    // Query for creator by username
    const creatorsRef = db.collection("creators")
    const snapshot = await creatorsRef.where("username", "==", username).limit(1).get()

    if (snapshot.empty) {
      return notFound()
    }

    const creatorData = snapshot.docs[0].data()

    // Pass the creator data to the client component
    return <CreatorProfile creator={creatorData} />
  } catch (error) {
    console.error("Error fetching creator data:", error)
    return notFound()
  }
}
