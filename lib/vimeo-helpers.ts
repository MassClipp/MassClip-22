/**
 * Fetches videos from a Vimeo showcase
 */
export async function fetchVimeoShowcaseVideos(showcaseId: string) {
  try {
    const response = await fetch(`/api/vimeo/showcases/${showcaseId}/videos`)

    if (!response.ok) {
      throw new Error(`Failed to fetch showcase videos: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error(`Error fetching showcase videos for ${showcaseId}:`, error)
    return []
  }
}

/**
 * Maps showcase IDs to category names
 */
export const showcaseToCategoryMap: Record<string, string> = {
  // Add your showcase ID to category mappings here
  // Example: "12345678": "hustle-mentality"
}

/**
 * Maps category names to showcase IDs
 */
export const categoryToShowcaseMap: Record<string, string> = {
  // Add your category to showcase ID mappings here
  // Example: "hustle-mentality": "12345678"
}

/**
 * Gets the showcase ID for a category
 */
export function getShowcaseIdForCategory(category: string): string | undefined {
  return categoryToShowcaseMap[category]
}

/**
 * Gets the category for a showcase ID
 */
export function getCategoryForShowcaseId(showcaseId: string): string | undefined {
  return showcaseToCategoryMap[showcaseId]
}
