import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import CreatorProfileWithSidebar from "@/components/creator-profile-with-sidebar"

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
      }),
    )

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
            url: userData?.photoURL || "https://massclip.pro/og-image.jpg",
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

    // Query users collection to find the user with the given username (case insensitive)
    const usersRef = db.collection("users")

    // First try exact match
    let querySnapshot = await usersRef.where("username", "==", username.toLowerCase()).get()

    // If no results, try case-insensitive match
    if (querySnapshot.empty) {
      console.log(`[Page] No exact match found, trying case-insensitive match`)
      querySnapshot = await usersRef.get()

      // Filter results manually for case-insensitive match
      const docs = querySnapshot.docs.filter((doc) => {
        const userData = doc.data()
        return userData.username && userData.username.toLowerCase() === username.toLowerCase()
      })

      if (docs.length === 0) {
        console.log(`[Page] Creator profile not found for username: ${username} (case-insensitive)`)

        // Log all usernames for debugging
        const allUsers = querySnapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            username: data.username,
            displayName: data.displayName,
          }
        })
        console.log(`[Page] Available users:`, JSON.stringify(allUsers))

        notFound()
      }

      // Use the first matching document
      querySnapshot = {
        empty: false,
        docs: docs,
        size: docs.length,
      } as any
    }

    console.log(`[Page] Query results: ${querySnapshot.size} documents found`)

    if (querySnapshot.empty) {
      console.log(`[Page] Creator profile not found for username: ${username}`)
      notFound()
    }

    // Get the user document
    const userDoc = querySnapshot.docs[0]
    const userData = userDoc.data()
    const uid = userDoc.id

    console.log(`[Page] Creator profile found for username: ${username} with UID: ${uid}`)
    console.log(
      `[Page] User data:`,
      JSON.stringify({
        displayName: userData.displayName,
        username: userData.username,
        hasPhotoURL: !!userData.photoURL,
        hasBio: !!userData.bio,
      }),
    )

    // Serialize the Firestore data to plain objects
    const serializedData = serializeData(userData)

    // Format the creator data for the component
    const creatorData = {
      uid: uid,
      username: serializedData.username || username,
      displayName: serializedData.displayName || username,
      bio: serializedData.bio || "",
      profilePic: serializedData.photoURL || "",
      createdAt: serializedData.createdAt || new Date().toISOString(),
      socialLinks: serializedData.socialLinks || {},
      premiumEnabled: serializedData.premiumEnabled || false,
      premiumPrice: serializedData.premiumPrice || 0,
      stripePriceId: serializedData.stripePriceId || "",
      paymentMode: serializedData.paymentMode || "one-time",
    }

    return <CreatorProfileWithSidebar creator={creatorData} />
  } catch (error) {
    console.error(`[Page] Error fetching creator profile for ${username}:`, error)
    notFound()
  }
}
