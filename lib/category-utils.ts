/**
 * Normalizes a category name to prevent duplicates due to case differences or whitespace
 * @param categoryName The raw category name to normalize
 * @returns Normalized category name
 */
export function normalizeCategory(categoryName: string): string {
  if (!categoryName) return ""

  // Convert to lowercase, trim whitespace, and replace multiple spaces with single space
  return categoryName.toLowerCase().trim().replace(/\s+/g, " ")
}

/**
 * Predefined list of category tags that match the dropdown options
 */
export const PREDEFINED_TAGS = ["Motivation", "Meme", "Sports", "Streamer Clip", "Other"]

/**
 * Checks if a tag is in the predefined list (case-insensitive)
 * @param tag The tag to check
 * @returns Boolean indicating if the tag is predefined
 */
export function isValidTag(tag: string): boolean {
  if (!tag) return false
  return PREDEFINED_TAGS.some((predefinedTag) => normalizeCategory(predefinedTag) === normalizeCategory(tag))
}

/**
 * Gets the proper case version of a tag from the predefined list
 * @param tag The tag to normalize
 * @returns The properly cased tag from the predefined list, or the original if not found
 */
export function getProperCaseTag(tag: string): string {
  if (!tag) return ""

  const normalizedTag = normalizeCategory(tag)
  const matchedTag = PREDEFINED_TAGS.find((predefinedTag) => normalizeCategory(predefinedTag) === normalizedTag)

  return matchedTag || tag
}
