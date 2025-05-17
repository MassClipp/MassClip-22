"use server"

import { db } from "@/lib/firebase-admin"
import type { UserClip } from "@/lib/types"

export async function getClipsByCreator(creatorId: string) {
  try {
    const clipsSnapshot = await db
      .collection("clips")
      .where("creatorId", "==", creatorId)
      .where("isPublished", "==", true)
      .get()

    const clips = clipsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as UserClip[]

    return { clips }
  } catch (error) {
    console.error("Error fetching creator clips:", error)
    return { clips: [], error: "Failed to fetch clips" }
  }
}

export async function getUserPurchasedClips(userId: string) {
  try {
    // Get the IDs of clips the user has purchased
    const purchasedSnapshot = await db.collection("users").doc(userId).collection("purchasedClips").get()

    const purchasedClipIds = purchasedSnapshot.docs.map((doc) => doc.id)

    // If no purchased clips, return empty array
    if (purchasedClipIds.length === 0) {
      return { clips: [] }
    }

    // Fetch the actual clip data
    // Note: Firestore "in" queries are limited to 10 items, so we may need to batch
    const batchSize = 10
    const batches = []

    for (let i = 0; i < purchasedClipIds.length; i += batchSize) {
      const batch = purchasedClipIds.slice(i, i + batchSize)
      batches.push(batch)
    }

    // Execute each batch query
    const clipPromises = batches.map((batch) => db.collection("clips").where("id", "in", batch).get())

    const snapshots = await Promise.all(clipPromises)

    // Combine results
    const clips = snapshots.flatMap((snapshot) =>
      snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        isPurchased: true,
      })),
    ) as UserClip[]

    return { clips }
  } catch (error) {
    console.error("Error fetching purchased clips:", error)
    return { clips: [], error: "Failed to fetch purchased clips" }
  }
}
