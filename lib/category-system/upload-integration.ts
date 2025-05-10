import { assignCategoryToVideo } from "./category-db"

interface AssignCategoryParams {
  videoId: string
  categoryId: string
  userId?: string
}

/**
 * Assigns a category to a video after upload
 * This is a separate function to avoid interfering with the upload flow
 */
export async function assignCategoryAfterUpload({ videoId, categoryId, userId }: AssignCategoryParams): Promise<void> {
  try {
    console.log(`Assigning category ${categoryId} to video ${videoId}`)
    await assignCategoryToVideo(videoId, categoryId, true, "user_upload")
    console.log(`Successfully assigned category ${categoryId} to video ${videoId}`)
  } catch (error) {
    console.error(`Error assigning category ${categoryId} to video ${videoId}:`, error)
    throw error
  }
}
