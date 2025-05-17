import { notFound } from "next/navigation"
import { db } from "@/lib/firebase-admin"
import CreatorProfilePage from "./creator-profile-page"

// This ensures the page is server-rendered and SEO-friendly
export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: { username: string } }) {
  const { username } = params

  try {
    // Find profile by username (case insensitive)
    const snapshot = await db
      .collection("creatorProfiles")
      .where("username", "==", username.toLowerCase())
      .limit(1)
      .get()

    if (snapshot.empty) {
      return {
        title: "Creator Not Found | MassClip",
        description: "The creator profile you are looking for does not exist.",
      }
    }

    const profileData = snapshot.docs[0].data()

    return {
      title: `${profileData.displayName} (@${profileData.username}) | MassClip`,
      description: profileData.bio || `Check out ${profileData.displayName}'s clips on MassClip`,
      openGraph: {
        images: profileData.profileImage ? [profileData.profileImage] : [],
        title: `${profileData.displayName} (@${profileData.username}) | MassClip`,
        description: profileData.bio || `Check out ${profileData.displayName}'s clips on MassClip`,
      },
      twitter: {
        card: "summary_large_image",
        title: `${profileData.displayName} (@${profileData.username}) | MassClip`,
        description: profileData.bio || `Check out ${profileData.displayName}'s clips on MassClip`,
        images: profileData.profileImage ? [profileData.profileImage] : [],
      },
    }
  } catch (error) {
    console.error("Error generating metadata:", error)
    return {
      title: "Creator Profile | MassClip",
      description: "View creator clips on MassClip",
    }
  }
}

export default async function CreatorPage({ params }: { params: { username: string } }) {
  const { username } = params

  try {
    // Find profile by username (case insensitive)
    const snapshot = await db
      .collection("creatorProfiles")
      .where("username", "==", username.toLowerCase())
      .limit(1)
      .get()

    if (snapshot.empty) {
      notFound()
    }

    const profileDoc = snapshot.docs[0]
    const profile = {
      uid: profileDoc.id,
      ...profileDoc.data(),
      // Ensure dates are serializable
      createdAt: profileDoc.data().createdAt?.toDate?.() || new Date(),
      updatedAt: profileDoc.data().updatedAt?.toDate?.() || new Date(),
    }

    return <CreatorProfilePage profile={profile} />
  } catch (error) {
    console.error("Error fetching creator profile:", error)
    notFound()
  }
}
