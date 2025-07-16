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

    // Get user data from users collection
    const userDoc = await db.collection("users").doc(uid).get()

    if (!userDoc.exists) {
      console.error(`[ProfileSync] User document not found for UID: ${uid}`)
      return { success: false, error: "User not found" }
    }

    const userData = userDoc.data()
    console.log(`[ProfileSync] Found user data:`, {
      username: userData.username,
      displayName: userData.displayName,
      hasProfilePic: !!userData.profilePic,
      hasBio: !!userData.bio,
    })

    // Check if creator profile exists by username
    const creatorByUsernameQuery = await db.collection("creators").where("username", "==", username.toLowerCase()).get()

    // Check if creator profile exists by UID
    const creatorByUidQuery = await db.collection("creators").where("uid", "==", uid).get()

    // Combine results and remove duplicates
    const creatorDocsMap = new Map()

    creatorByUsernameQuery.docs.forEach((doc) => {
      creatorDocsMap.set(doc.id, doc)
    })

    creatorByUidQuery.docs.forEach((doc) => {
      creatorDocsMap.set(doc.id, doc)
    })

    const creatorDocs = Array.from(creatorDocsMap.values())

    const creatorProfileData = {
      uid: uid,
      username: userData.username?.toLowerCase() || username.toLowerCase(),
      displayName: userData.displayName || "",
      bio: userData.bio || "",
      profilePic: userData.profilePic || userData.photoURL || null,
      updatedAt: new Date(),
      // Preserve existing creator-specific fields
      totalVideos: 0,
      totalDownloads: 0,
      totalEarnings: 0,
      isVerified: false,
    }

    if (creatorDocs.length > 0) {
      // Update existing creator profile(s)
      console.log(`[ProfileSync] Updating ${creatorDocs.length} existing creator profile(s)`)

      for (const creatorDoc of creatorDocs) {
        const existingData = creatorDoc.data()

        // Preserve existing creator-specific data
        const updatedData = {
          ...creatorProfileData,
          totalVideos: existingData.totalVideos || 0,
          totalDownloads: existingData.totalDownloads || 0,
          totalEarnings: existingData.totalEarnings || 0,
          isVerified: existingData.isVerified || false,
          createdAt: existingData.createdAt || new Date(),
        }

        console.log(`[ProfileSync] Updating creator profile: ${creatorDoc.id}`)
        await db.collection("creators").doc(creatorDoc.id).update(updatedData)
      }
    } else {
      // Create new creator profile
      console.log(`[ProfileSync] Creating new creator profile for username: ${username}`)

      const newCreatorData = {
        ...creatorProfileData,
        createdAt: new Date(),
      }

      await db.collection("creators").doc(username.toLowerCase()).set(newCreatorData)
    }

    // Also ensure there's a creator profile with the correct username as document ID
    const primaryCreatorDoc = await db.collection("creators").doc(username.toLowerCase()).get()

    if (!primaryCreatorDoc.exists) {
      console.log(`[ProfileSync] Creating primary creator document: ${username.toLowerCase()}`)

      const primaryCreatorData = {
        ...creatorProfileData,
        createdAt: new Date(),
      }

      await db.collection("creators").doc(username.toLowerCase()).set(primaryCreatorData)
    } else {
      // Update the primary creator document
      const existingData = primaryCreatorDoc.data()

      const updatedData = {
        ...creatorProfileData,
        totalVideos: existingData.totalVideos || 0,
        totalDownloads: existingData.totalDownloads || 0,
        totalEarnings: existingData.totalEarnings || 0,
        isVerified: existingData.isVerified || false,
        createdAt: existingData.createdAt || new Date(),
      }

      console.log(`[ProfileSync] Updating primary creator document: ${username.toLowerCase()}`)
      await db.collection("creators").doc(username.toLowerCase()).update(updatedData)
    }

    console.log(`[ProfileSync] Profile sync completed successfully`)
    return { success: true }
  } catch (error) {
    console.error("[ProfileSync] Error syncing profiles:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Force sync all creator profiles from users collection
 */
export async function syncAllCreatorProfiles() {
  try {
    console.log(`[ProfileSync] Starting bulk sync of all creator profiles`)

    const usersSnapshot = await db.collection("users").get()
    const syncPromises = []

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data()
      if (userData.username && userData.uid) {
        syncPromises.push(syncUserAndCreatorProfiles(userData.uid, userData.username))
      }
    }

    const results = await Promise.allSettled(syncPromises)
    const successful = results.filter((r) => r.status === "fulfilled" && r.value.success).length
    const failed = results.length - successful

    console.log(`[ProfileSync] Bulk sync completed: ${successful} successful, ${failed} failed`)

    return {
      success: true,
      total: results.length,
      successful,
      failed,
    }
  } catch (error) {
    console.error("[ProfileSync] Error in bulk sync:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
