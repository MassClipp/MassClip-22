import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { collection, query, where, getDocs, limit } from "firebase/firestore"
import { db } from "@/firebase/firebase"
import CreatorProfileWithSidebar from "@/components/creator-profile-with-sidebar"
import ProfileViewTracker from "@/components/profile-view-tracker"

interface CreatorPageProps {
  params: {
    username: string
  }
}

async function getCreatorByUsername(username: string) {
  try {
    console.log("🔍 [CreatorPage] Fetching creator by username:", username)

    // Query the creators collection by username
    const creatorsRef = collection(db, "creators")
    const q = query(creatorsRef, where("username", "==", username), limit(1))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      console.log("❌ [CreatorPage] Creator not found in creators collection")
      return null
    }

    const creatorDoc = querySnapshot.docs[0]
    const creatorData = creatorDoc.data()

    console.log("✅ [CreatorPage] Creator found:", creatorData)

    return {
      id: creatorDoc.id,
      username: creatorData.username,
      displayName: creatorData.displayName || creatorData.username,
      bio: creatorData.bio,
      profilePic: creatorData.profilePic,
      instagramHandle: creatorData.instagramHandle,
      xHandle: creatorData.xHandle,
      tiktokHandle: creatorData.tiktokHandle,
      memberSince: creatorData.createdAt || creatorData.memberSince,
      freeContentCount: creatorData.freeContentCount || 0,
      premiumContentCount: creatorData.premiumContentCount || 0,
    }
  } catch (error) {
    console.error("❌ [CreatorPage] Error fetching creator:", error)
    return null
  }
}

// Generate metadata for the page
export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  const { username } = params

  try {
    console.log(`[Metadata] Looking for user with username: ${username}`)

    // Query users collection to find the user with the given username (case insensitive)
    const usersRef = collection(db, "users")
    const querySnapshot = await getDocs(query(usersRef, where("username", "==", username.toLowerCase()), limit(1)))

    console.log(`[Metadata] Query results: ${querySnapshot.size} documents found`)

    if (querySnapshot.empty) {
      console.log(`[Metadata] Creator not found for username: ${username}`)
      return {
        title: "Creator Not Found | MassClip",
        description: "The creator profile you're looking for doesn't exist.",
      }
    }

    const userData = querySnapshot.docs[0].data()
    console.log(
      `[Metadata] Found user data:`,
      JSON.stringify({
        displayName: userData.displayName,
        username: userData.username,
        hasPhotoURL: !!userData.photoURL,
        hasProfilePic: !!userData.profilePic,
      }),
    )

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

export default async function CreatorPage({ params }: CreatorPageProps) {
  const creator = await getCreatorByUsername(params.username)

  if (!creator) {
    notFound()
  }

  return (
    <>
      <ProfileViewTracker profileUserId={creator.id} />
      <CreatorProfileWithSidebar creator={creator} />
    </>
  )
}
