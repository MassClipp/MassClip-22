import { db } from "@/lib/firebase-admin"

/**
 * Synchronizes a user's profile with their creator profile
 * @param uid User ID
 * @param username Username
 * @returns Success status
 */
export async function syncUserAndCreatorProfiles(uid: string, username: string) {
  try {
    console.log(`[ProfileSync] Syncing profiles for user ${uid} with username ${username}`)

    // Get user data
    const userDoc = await db.collection("users").doc(uid).get()

    if (!userDoc.exists) {
      console.error(`[ProfileSync] User document not found for UID: ${uid}`)
      return { success: false, error: "User not found" }
    }

    const userData = userDoc.data()

    // Check if creator profile exists by username
    const creatorByUsernameQuery = await db.collection("creators").where("username", "==", username.toLowerCase()).get()

    // Check if creator profile exists by UID
    const creatorByUidQuery = await db.collection("creators").where("uid", "==", uid).get()

    // Combine results
    const creatorDocs = [...creatorByUsernameQuery.docs, ...creatorByUidQuery.docs]

    if (creatorDocs.length > 0) {
      // Update existing creator profile(s)
      for (const creatorDoc of creatorDocs) {
        console.log(`[ProfileSync] Updating creator profile: ${creatorDoc.id}`)

        await db
          .collection("creators")
          .doc(creatorDoc.id)
          .update({
            uid: uid,
            username: userData.username.toLowerCase(),
            displayName: userData.displayName || "",
            bio: userData.bio || "",
            profilePic: userData.profilePic || userData.photoURL || null,
            updatedAt: new Date(),
          })
      }
    } else {
      // Create new creator profile
      console.log(`[ProfileSync] Creating new creator profile for username: ${username}`)

      await db
        .collection("creators")
        .doc(username.toLowerCase())
        .set({
          uid: uid,
          username: userData.username.toLowerCase(),
          displayName: userData.displayName || "",
          bio: userData.bio || "",
          profilePic: userData.profilePic || userData.photoURL || null,
          totalVideos: 0,
          totalDownloads: 0,
          totalEarnings: 0,
          isVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
    }

    return { success: true }
  } catch (error) {
    console.error("[ProfileSync] Error syncing profiles:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
