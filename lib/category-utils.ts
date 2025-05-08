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
 * Predefined list of niches that match the dropdown options
 */
export const PREDEFINED_NICHES = ["Motivation", "Meme", "Sports", "Streamer Clip", "Other"]

/**
 * Initial mapping of niches to their associated tags
 * This will be dynamically updated with data from the showcases
 */
export const NICHE_TO_TAGS_MAPPING: Record<string, string[]> = {
  Motivation: [
    "Introspection",
    "Hustle Mentality",
    "High Energy Motivation",
    "Faith",
    "Money & Wealth",
    "Motivational Speeches",
  ],
  Meme: ["Funny", "Viral", "Trending"],
  Sports: ["Basketball", "Football", "Soccer", "Highlights"],
  "Streamer Clip": ["Gaming", "IRL", "Reaction", "Commentary"],
  Other: ["Miscellaneous", "Uncategorized"],
}

/**
 * Checks if a niche is in the predefined list (case-insensitive)
 * @param niche The niche to check
 * @returns Boolean indicating if the niche is predefined
 */
export function isValidNiche(niche: string): boolean {
  if (!niche) return false
  return PREDEFINED_NICHES.some((predefinedNiche) => normalizeCategory(predefinedNiche) === normalizeCategory(niche))
}

/**
 * Gets the proper case version of a niche from the predefined list
 * @param niche The niche to normalize
 * @returns The properly cased niche from the predefined list, or the original if not found
 */
export function getProperCaseNiche(niche: string): string {
  if (!niche) return ""

  const normalizedNiche = normalizeCategory(niche)
  const matchedNiche = PREDEFINED_NICHES.find(
    (predefinedNiche) => normalizeCategory(predefinedNiche) === normalizedNiche,
  )

  return matchedNiche || niche
}

/**
 * Gets the list of tags associated with a specific niche
 * @param niche The niche to get tags for
 * @returns Array of tags for the niche, or empty array if niche not found
 */
export function getTagsForNiche(niche: string): string[] {
  const properCaseNiche = getProperCaseNiche(niche)
  return NICHE_TO_TAGS_MAPPING[properCaseNiche] || []
}

/**
 * Updates the tags for a specific niche
 * @param niche The niche to update tags for
 * @param tags Array of tags to associate with the niche
 */
export function updateTagsForNiche(niche: string, tags: string[]): void {
  const properCaseNiche = getProperCaseNiche(niche)
  if (properCaseNiche && PREDEFINED_NICHES.includes(properCaseNiche)) {
    NICHE_TO_TAGS_MAPPING[properCaseNiche] = [...tags]
  }
}
