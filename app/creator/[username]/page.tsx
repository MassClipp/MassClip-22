import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import CreatorProfileRedesigned from "@/components/creator-profile-redesigned"

interface PageProps {
  params: {
    username: string
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = params

  // Query for user by username
  const usersQuery = query(collection(db, "users"), where("username", "==", username))
  const userSnapshot = await getDocs(usersQuery)

  if (userSnapshot.empty) {
    return {
      title: "Creator Not Found",
    }
  }

  const userData = userSnapshot.docs[0].data()
  const displayName = userData.displayName || username

  return {
    title: `${displayName} - MassClip Creator`,
    description: userData.bio || `Check out ${displayName}'s content on MassClip`,
  }
}

export default async function CreatorProfilePage({ params }: PageProps) {
  const { username } = params

  // Query for user by username
  const usersQuery = query(collection(db, "users"), where("username", "==", username))
  const userSnapshot = await getDocs(usersQuery)

  if (userSnapshot.empty) {
    notFound()
  }

  const userDoc = userSnapshot.docs[0]
  const userData = userDoc.data()
  const creatorId = userDoc.id

  // Fetch videos
  const videosQuery = query(collection(db, "videos"), where("uid", "==", creatorId), where("status", "==", "active"))

  const videosSnapshot = await getDocs(videosQuery)
  const videos = videosSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))

  const freeVideos = videos.filter((v) => v.type === "free")
  const premiumVideos = videos.filter((v) => v.type === "premium")

  return (
    <CreatorProfileRedesigned
      creatorId={creatorId}
      creatorData={{
        ...userData,
        username,
        freeVideosCount: freeVideos.length,
        premiumVideosCount: premiumVideos.length,
      }}
      initialFreeVideos={freeVideos}
      initialPremiumVideos={premiumVideos}
    />
  )
}
