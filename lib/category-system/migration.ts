/**
 * Migration utilities for the category system
 */

import { db } from "@/lib/firebase"
import { collection, getDocs, query, limit } from "firebase/firestore"
import { assignCategoryFromShowcase, assignCategoryFromUpload } from "./category-service"
import { SHOWCASE_TO_CATEGORY_MAP } from "./constants"

/**
 * Migrate videos from the old categoryAssignments collection
 */
export async function migrateFromOldCategoryAssignments(batchSize = 100) {
  const oldAssignmentsRef = collection(db, "categoryAssignments")
  const q = query(oldAssignmentsRef, limit(batchSize))
  const querySnapshot = await getDocs(q)

  let migratedCount = 0

  for (const doc of querySnapshot.docs) {
    const data = doc.data()

    try {
      // Assign the category using the new system
      await assignCategoryFromUpload(
        data.videoId,
        data.category,
        true, // Make it primary
      )

      migratedCount++
    } catch (err) {
      console.error(`Error migrating category assignment for video ${data.videoId}:`, err)
    }
  }

  return {
    processed: querySnapshot.size,
    migrated: migratedCount,
  }
}

/**
 * Migrate videos from Vimeo showcases
 */
export async function migrateFromShowcases(showcaseIds: string[]) {
  let totalMigrated = 0

  for (const showcaseId of showcaseIds) {
    const categoryId = SHOWCASE_TO_CATEGORY_MAP[showcaseId]

    if (!categoryId) {
      console.warn(`No category mapping found for showcase ${showcaseId}`)
      continue
    }

    try {
      // Fetch videos from the showcase
      const response = await fetch(`/api/vimeo/showcases/${showcaseId}/videos`)

      if (!response.ok) {
        throw new Error(`Failed to fetch videos for showcase ${showcaseId}: ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.data || !Array.isArray(data.data)) {
        throw new Error(`Invalid response format for showcase ${showcaseId}`)
      }

      // Migrate each video
      for (const video of data.data) {
        const videoId = video.uri.split("/").pop()

        if (!videoId) {
          console.warn(`Could not extract video ID from URI: ${video.uri}`)
          continue
        }

        await assignCategoryFromShowcase(videoId, showcaseId)
        totalMigrated++
      }
    } catch (err) {
      console.error(`Error migrating videos from showcase ${showcaseId}:`, err)
    }
  }

  return { migrated: totalMigrated }
}

/**
 * Migrate videos from the uploads collection
 */
export async function migrateFromUploads(batchSize = 100) {
  const uploadsRef = collection(db, "uploads")
  const q = query(uploadsRef, limit(batchSize))
  const querySnapshot = await getDocs(q)

  let migratedCount = 0

  for (const doc of querySnapshot.docs) {
    const data = doc.data()

    if (!data.vimeoId || !data.category) {
      continue
    }

    try {
      // Assign the category using the new system
      await assignCategoryFromUpload(
        data.vimeoId,
        data.category,
        true, // Make it primary
      )

      migratedCount++
    } catch (err) {
      console.error(`Error migrating category for upload ${doc.id}:`, err)
    }
  }

  return {
    processed: querySnapshot.size,
    migrated: migratedCount,
  }
}
