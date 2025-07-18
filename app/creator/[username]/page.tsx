import { notFound } from "next/navigation"
import type { Metadata } from "next"
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
  if (plainData.updatedAt && typeof plainData.updatedAt.toDate === "function") {
    plainData.updatedAt = plainData.updatedAt.toDate().toISOString()
  }

  return plainData
}

// Generate metadata for the page
export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  const { username } = params

  try {
    // Try to initialize Firebase Admin if available
    let userData = null

    try {
      const { initializeFirebaseAdmin, db } = await import("@/lib/firebase-admin")
      initializeFirebaseAdmin()

      console.log(`[Metadata] Looking for user with username: ${username}`)

      // First try users collection for most up-to-date data
      const usersRef = db.collection("users")
      let querySnapshot = await usersRef.where("username", "==", username.toLowerCase()).get()

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
    } catch (firebaseError) {
      console.log(`[Metadata] Firebase not available, using fallback metadata`)
    }

    if (!userData) {
      console.log(`[Metadata] Creator not found for username: ${username}`)
      return {
        title: `${username} | MassClip`,
        description: `Check out ${username}'s content on MassClip`,
      }
    }

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
      title: `${username} | MassClip`,
      description: `Check out ${username}'s content on MassClip`,
    }
  }
}

export default async function CreatorProfilePage({ params }: { params: { username: string } }) {
  const { username } = params

  try {
    console.log(`[Page] Fetching creator profile for username: ${username}`)

    let userData = null
    let uid = null

    try {
      // Try to initialize Firebase Admin if available
      const { initializeFirebaseAdmin, db } = await import("@/lib/firebase-admin")
      initializeFirebaseAdmin()

      // First try to find the user in the users collection (most up-to-date data)
      console.log(`[Page] Checking users collection for username: ${username}`)
      const usersRef = db.collection("users")
      let querySnapshot = await usersRef.where("username", "==", username.toLowerCase()).get()

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0]
        userData = userDoc.data()
        uid = userData.uid || userDoc.id
        console.log(`[Page] Found user in users collection with UID: ${uid}`)
      } else {
        // Fallback: try case-insensitive match in users collection
        console.log(`[Page] No exact match found in users collection, trying case-insensitive match`)
        const allUsersSnapshot = await usersRef.get()
        const matchingDocs = allUsersSnapshot.docs.filter((doc) => {
          const data = doc.data()
          return data.username && data.username.toLowerCase() === username.toLowerCase()
        })

        if (matchingDocs.length > 0) {
          userData = matchingDocs[0].data()
          uid = userData.uid || matchingDocs[0].id
          console.log(`[Page] Found user via case-insensitive match with UID: ${uid}`)
        }
      }

      // If still not found, try creators collection
      if (!userData) {
        console.log(`[Page] User not found in users collection, checking creators collection`)
        const creatorsRef = db.collection("creators")

        // Try exact match on username
        querySnapshot = await creatorsRef.where("username", "==", username.toLowerCase()).get()

        if (!querySnapshot.empty) {
          userData = querySnapshot.docs[0].data()
          uid = userData.uid || querySnapshot.docs[0].id
          console.log(`[Page] Found creator by username with UID: ${uid}`)
        } else {
          // Try by document ID
          console.log(`[Page] Creator not found by username, checking by document ID`)
          const creatorDoc = await creatorsRef.doc(username.toLowerCase()).get()

          if (creatorDoc.exists) {
            userData = creatorDoc.data()
            uid = userData.uid || creatorDoc.id
            console.log(`[Page] Found creator by document ID with UID: ${uid}`)
          }
        }
      }

      // If we found the user in creators collection but not users, try to get fresh data from users
      if (uid && !userData.email) {
        console.log(`[Page] Attempting to get fresh user data from users collection for UID: ${uid}`)
        try {
          const freshUserDoc = await db.collection("users").doc(uid).get()
          if (freshUserDoc.exists) {
            const freshUserData = freshUserDoc.data()
            console.log(`[Page] Found fresh user data, merging with creator data`)

            // Merge fresh user data with existing creator data, prioritizing user data
            userData = {
              ...userData,
              ...freshUserData,
              // Ensure we keep the UID
              uid: uid,
            }
          }
        } catch (error) {
          console.warn(`[Page] Could not fetch fresh user data for UID ${uid}:`, error)
        }
      }
    } catch (firebaseError) {
      console.log(`[Page] Firebase not available, creating demo profile for: ${username}`)

      // Create a demo profile when Firebase isn't configured
      userData = {
        uid: `demo-${username}`,
        username: username.toLowerCase(),
        displayName: username.charAt(0).toUpperCase() + username.slice(1),
        bio: "This is a demo profile. Configure Firebase to see real creator data.",
        profilePic: null,
        email: `${username}@demo.com`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      uid = userData.uid
    }

    if (!userData || !uid) {
      console.log(`[Page] Creator profile not found for username: ${username}`)
      notFound()
    }

    console.log(
      `[Page] Final user data:`,
      JSON.stringify({
        uid: uid,
        username: userData.username,
        displayName: userData.displayName,
        hasProfilePic: !!userData.profilePic,
        hasPhotoURL: !!userData.photoURL,
        hasBio: !!userData.bio,
        hasSocialLinks: !!userData.socialLinks,
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
      // Add additional fields that might be useful
      email: serializedData.email || "",
      updatedAt: serializedData.updatedAt || new Date().toISOString(),
    }

    console.log(
      `[Page] Passing creator data to component:`,
      JSON.stringify({
        uid: creatorData.uid,
        username: creatorData.username,
        displayName: creatorData.displayName,
        hasProfilePic: !!creatorData.profilePic,
        hasBio: !!creatorData.bio,
        hasSocialLinks: Object.keys(creatorData.socialLinks).length > 0,
      }),
    )

    return (
      <>
        <ProfileViewTracker profileUserId={uid} />
        <CreatorProfileWithSidebar creator={creatorData} />
      </>
    )
  } catch (error) {
    console.error(`[Page] Error fetching creator profile for ${username}:`, error)

    // Return a fallback profile instead of notFound
    const fallbackCreatorData = {
      uid: `fallback-${username}`,
      username: username.toLowerCase(),
      displayName: username.charAt(0).toUpperCase() + username.slice(1),
      bio: "Profile temporarily unavailable. Please try again later.",
      profilePic: "",
      createdAt: new Date().toISOString(),
      socialLinks: {},
      email: "",
      updatedAt: new Date().toISOString(),
    }

    return (
      <>
        <ProfileViewTracker profileUserId={fallbackCreatorData.uid} />
        <CreatorProfileWithSidebar creator={fallbackCreatorData} />
      </>
    )
  }
}
