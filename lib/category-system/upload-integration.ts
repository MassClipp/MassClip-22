/**
 * Integration with the upload flow
 */

import { assignCategoryToVideo } from "./category-db"

/**
 * Assign a category to a video after upload
 */
export async function assignCategoryAfterUpload({
  videoId,
  categoryId,
}: {
  videoId: string
  categoryId: string
}): Promise<{ success: boolean; error?: any }> {
  try {
    // Validate inputs
    if (!videoId || !categoryId) {
      console.warn("Missing required parameters for category assignment")
      return { success: false, error: "Missing required parameters" }
    }

    // Assign the category
    await assignCategoryToVideo(videoId, categoryId, true)

    console.log(`Category ${categoryId} assigned to video ${videoId}`)
    return { success: true }
  } catch (error) {
    console.error("Error assigning category after upload:", error)
    return { success: false, error }
  }
}
