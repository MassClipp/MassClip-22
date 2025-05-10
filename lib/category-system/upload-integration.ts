/**
 * Integration with the upload flow
 *
 * This file provides functions that can be called from the upload flow
 * without modifying the existing upload logic.
 */

import { assignCategoryFromUpload } from "./category-service"

/**
 * Assign a category to a video after upload
 *
 * This function is designed to be called after a successful upload
 * without interfering with the upload flow.
 */
export async function assignCategoryAfterUpload({
  videoId,
  categoryId,
  userId,
  videoTitle,
}: {
  videoId: string
  categoryId: string
  userId: string
  videoTitle: string
}): Promise<{ success: boolean; error?: any }> {
  try {
    // Validate inputs
    if (!videoId || !categoryId) {
      console.warn("Missing required parameters for category assignment")
      return { success: false, error: "Missing required parameters" }
    }

    // Assign the category
    await assignCategoryFromUpload(videoId, categoryId, true)

    console.log(`Category ${categoryId} assigned to video ${videoId}`)
    return { success: true }
  } catch (error) {
    console.error("Error assigning category after upload:", error)
    return { success: false, error }
  }
}

/**
 * Get a list of all active categories for the upload form
 *
 * This is a simplified version that doesn't require React hooks
 */
export async function getActiveCategoriesForUpload(): Promise<Array<{ id: string; name: string }>> {
  try {
    // Import dynamically to avoid circular dependencies
    const { getActiveCategories } = await import("./category-service")

    const categories = await getActiveCategories()

    // Return a simplified version with just id and name
    return categories.map((category) => ({
      id: category.id,
      name: category.name,
    }))
  } catch (error) {
    console.error("Error getting categories for upload:", error)
    return []
  }
}
