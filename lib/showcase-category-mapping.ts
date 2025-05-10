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
