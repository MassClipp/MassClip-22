import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getFirestore, doc, getDoc } from "firebase/firestore"
import { initializeFirebaseApp } from "@/lib/firebase"
import CreatorProfile from "@/components/creator-profile"

// Initialize Firebase
initializeFirebaseApp()

// Generate metadata for the page
export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  const { username } = params

  try {
    const db = getFirestore()
    const creatorDoc = await getDoc(doc(db, "creators", username))

    if (!creatorDoc.exists()) {
      return {
        title: "Creator Not Found | MassClip",
      }
    }

    const creatorData = creatorDoc.data()

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
    const db = getFirestore()
    const creatorDoc = await getDoc(doc(db, "creators", username))

    if (!creatorDoc.exists()) {
      notFound()
    }

    const creatorData = creatorDoc.data()

    return <CreatorProfile creator={creatorData} />
  } catch (error) {
    console.error("Error fetching creator data:", error)
    notFound()
  }
}
