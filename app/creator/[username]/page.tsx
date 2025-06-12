import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import CreatorProfileWithSidebar from "@/components/creator-profile-with-sidebar"
import ProfileViewTracker from "@/components/profile-view-tracker"

// Helper function to convert Firestore data to plain objects
function serializeData(data: any) {
  if (!data) return null

  // Convert to plain object
  const plainData = { ...data }

  // Handle Firestore Timestamp objects
  if (plainData.createdAt && typeof plainData.createdAt.toDate === "function") {
    plainData.createdAt = plainData.createdAt.toDate().toISOString()
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

    // Query users collection to find the user with the given username (case insensitive)
    const usersRef = db.collection("users")
    const querySnapshot = await usersRef.where("username", "==", username.toLowerCase()).get()

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

export default async function CreatorProfilePage({ params }: { params: { username: string } }) {
  const { username } = params

  try {
    console.log(`[Page] Fetching creator profile for username: ${username}`)

    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    // First try to find the user in the users collection
    const usersRef = db.collection("users")
    let querySnapshot = await usersRef.where("username", "==", username.toLowerCase()).get()

    // If no results, try case-insensitive match
    if (querySnapshot.empty) {
      console.log(`[Page] No exact match found in users collection, trying case-insensitive match`)

      // Get all users and filter manually (not efficient but works for small datasets)
      const allUsersSnapshot = await usersRef.get()
      const matchingDocs = allUsersSnapshot.docs.filter((doc) => {
        const userData = doc.data()
        return userData.username && userData.username.toLowerCase() === username.toLowerCase()
      })

      if (matchingDocs.length > 0) {
        querySnapshot = {
          empty: false,
          docs: matchingDocs,
          size: matchingDocs.length,
        } as any
      }
    }

    // If still not found, try the creators collection directly
    if (querySnapshot.empty) {
      console.log(`[Page] User not found in users collection, checking creators collection`)
      const creatorsRef = db.collection("creators")

      // Try exact match on username
      querySnapshot = await creatorsRef.where("username", "==", username.toLowerCase()).get()

      // If still not found, try by UID
      if (querySnapshot.empty) {
        console.log(`[Page] Creator not found by username, checking by document ID`)
        const creatorDoc = await creatorsRef.doc(username.toLowerCase()).get()

        if (creatorDoc.exists) {
          querySnapshot = {
            empty: false,
            docs: [creatorDoc],
            size: 1,
          } as any
        }
      }
    }

    console.log(`[Page] Final query results: ${querySnapshot?.size || 0} documents found`)

    if (!querySnapshot || querySnapshot.empty) {
      console.log(`[Page] Creator profile not found for username: ${username}`)
      notFound()
    }

    // Get the user document
    const userDoc = querySnapshot.docs[0]
    const userData = userDoc.data()
    const uid = userData.uid || userDoc.id

    console.log(`[Page] Creator profile found for username: ${username} with UID: ${uid}`)
    console.log(
      `[Page] User data:`,
      JSON.stringify({
        displayName: userData.displayName,
        username: userData.username,
        hasPhotoURL: !!userData.photoURL,
        hasProfilePic: !!userData.profilePic,
      }),
    )

    // Serialize the Firestore data to plain objects
    const serializedData = serializeData(userData)

    // Format the creator data for the component
    // Prioritize profilePic over photoURL for profile picture
    const profilePicture = serializedData.profilePic || serializedData.photoURL || ""

    const creatorData = {
      uid: uid,
      username: serializedData.username || username,
      displayName: serializedData.displayName || username,
      bio: serializedData.bio || "",
      profilePic: profilePicture,
      createdAt: serializedData.createdAt || new Date().toISOString(),
      socialLinks: serializedData.socialLinks || {},
    }

    return (
      <>
        <ProfileViewTracker profileUserId={uid} />
        <CreatorProfileWithSidebar creator={creatorData} />
      </>
    )
  } catch (error) {
    console.error(`[Page] Error fetching creator profile for ${username}:`, error)
    notFound()
  }
}
