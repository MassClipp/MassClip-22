import { notFound } from "next/navigation"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { CreatorProfile } from "@/components/creator-profile"

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

    // Fetch creator data
    const snapshot = await db.collection("creators").where("username", "==", username).limit(1).get()

    if (snapshot.empty) {
      return notFound()
    }

    const creatorData = snapshot.docs[0].data()

    return (
      <main>
        <CreatorProfile creator={creatorData} />
      </main>
    )
  } catch (error) {
    console.error("Error fetching creator:", error)
    return notFound()
  }
}
