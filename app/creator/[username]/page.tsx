import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getFirestore, collection, query, where, getDocs, limit } from "firebase/firestore"
import { initializeFirebaseApp } from "@/lib/firebase"
import CreatorPublicProfile from "@/components/creator-public-profile"

// Force dynamic rendering for this page
export const dynamic = "force-dynamic"

interface CreatorPageProps {
  params: {
    username: string
  }
}

export async function generateMetadata({ params }: CreatorPageProps): Promise<Metadata> {
  const { username } = params

  try {
    // Initialize Firebase
    initializeFirebaseApp()
    const db = getFirestore()

    // Query for the creator profile
    const profilesRef = collection(db, "users")
    const q = query(profilesRef, where("username", "==", username.toLowerCase()), limit(1))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      return {
        title: "Creator Not Found | MassClip",
        description: "The creator profile you are looking for does not exist.",
      }
    }

    const profileData = querySnapshot.docs[0].data()

    return {
      title: `${profileData.displayName || username} (@${username}) | MassClip`,
      description: profileData.bio || `Check out ${profileData.displayName || username}'s clips on MassClip`,
      openGraph: {
        images: profileData.profileImage ? [profileData.profileImage] : [],
        title: `${profileData.displayName || username} (@${username}) | MassClip`,
        description: profileData.bio || `Check out ${profileData.displayName || username}'s clips on MassClip`,
      },
      twitter: {
        card: "summary_large_image",
        title: `${profileData.displayName || username} (@${username}) | MassClip`,
        description: profileData.bio || `Check out ${profileData.displayName || username}'s clips on MassClip`,
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

export default async function CreatorPage({ params }: CreatorPageProps) {
  const { username } = params

  try {
    // Initialize Firebase
    initializeFirebaseApp()
    const db = getFirestore()

    // Query for the creator profile
    const profilesRef = collection(db, "users")
    const q = query(profilesRef, where("username", "==", username.toLowerCase()), limit(1))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      notFound()
    }

    const profileDoc = querySnapshot.docs[0]
    const profileData = profileDoc.data()

    // Prepare the profile data
    const profile = {
      id: profileDoc.id,
      username: username,
      displayName: profileData.displayName || username,
      bio: profileData.bio || "",
      profileImage: profileData.profileImage || null,
      coverImage: profileData.coverImage || null,
      socialLinks: profileData.socialLinks || {},
      isVerified: profileData.isVerified || false,
      createdAt: profileData.createdAt?.toDate?.() || new Date(),
    }

    return <CreatorPublicProfile profile={profile} />
  } catch (error) {
    console.error("Error fetching creator profile:", error)
    notFound()
  }
}
