import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import CreatorProfileMinimal from "@/components/creator-profile-minimal"

// Helper function to convert Firestore data to plain objects
function serializeData(data: any) {
  if (!data) return null

  // Convert to plain object
  const plainData = { ...data }

  // Handle Firestore Timestamp objects
  if (plainData.createdAt && typeof plainData.createdAt.toDate === "function") {
    plainData.createdAt = plainData.createdAt.toDate().toISOString()
  }
  if (plainData.updatedAt && typeof plainData.updatedAt.toDate === "function") {
    plainData.updatedAt = plainData.updatedAt.toDate().toISOString()
  }

  return plainData
}

// Generate metadata for the page
export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  const { username } = params

  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    console.log(`[Metadata] Looking for user with username: ${username}`)

    // First try users collection for most up-to-date data
    const usersRef = db.collection("users")
    let querySnapshot = await usersRef.where("username", "==", username.toLowerCase()).get()

    let userData = null

    if (!querySnapshot.empty) {
      userData = querySnapshot.docs[0].data()
      console.log(`[Metadata] Found user in users collection`)
    } else {
      // Fallback to creators collection
      console.log(`[Metadata] User not found in users collection, checking creators`)
      const creatorsRef = db.collection("creators")
      querySnapshot = await creatorsRef.where("username", "==", username.toLowerCase()).get()

      if (!querySnapshot.empty) {
        userData = querySnapshot.docs[0].data()
        console.log(`[Metadata] Found user in creators collection`)
      }
    }

    if (!userData) {
      console.log(`[Metadata] Creator not found for username: ${username}`)
      return {
        title: "Creator Not Found | MassClip",
        description: "The creator profile you're looking for doesn't exist.",
      }
    }

    // Prioritize profilePic over photoURL
    const profileImage = userData.profilePic || userData.photoURL || "https://massclip.pro/og-image.jpg"

    return {
      title: `${userData?.displayName || username} | MassClip`,
      description: userData?.bio || `Check out ${userData?.displayName || username}'s content on MassClip`,
      openGraph: {
        title: `${userData?.displayName || username} | MassClip`,
        description: userData?.bio || `Check out ${userData?.displayName || username}'s content on MassClip`,
        url: `https://massclip.pro/creator/${username}`,
        siteName: "MassClip",
        images: [
          {
            url: profileImage,
            width: 1200,
            height: 630,
            alt: userData?.displayName || username,
          },
        ],
        locale: "en_US",
        type: "website",
      },
    }
  } catch (error) {
    console.error("[Metadata] Error generating metadata:", error)
    return {
      title: "Creator Profile | MassClip",
      description: "View creator content on MassClip",
    }
  }
}

interface CreatorPageProps {
  params: {
    username: string
  }
}

async function getCreatorByUsername(username: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/uploads/by-username/${username}`, {
      cache: "no-store",
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.creator
  } catch (error) {
    console.error("Error fetching creator:", error)
    return null
  }
}

export default async function CreatorPage({ params }: CreatorPageProps) {
  const creator = await getCreatorByUsername(params.username)

  if (!creator) {
    notFound()
  }

  return <CreatorProfileMinimal creator={creator} />
}
