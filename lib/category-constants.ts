// Define the available niche categories for uploads
export const NICHE_CATEGORIES = [
  { id: "motivation", label: "Motivation" },
  { id: "sports", label: "Sports" },
  { id: "memes", label: "Memes" },
  { id: "streamers", label: "Streamers" },
  { id: "funny", label: "Funny" },
  { id: "other", label: "Other" },
]

// Helper function to get a niche label by ID (case-insensitive)
export function getNicheLabelById(id: string): string {
  const niche = NICHE_CATEGORIES.find((category) => category.id.toLowerCase() === id.toLowerCase())
  return niche ? niche.label : id
}

// Helper function to check if a tag is a valid niche
export function isValidNiche(tag: string): boolean {
  return NICHE_CATEGORIES.some((category) => category.id.toLowerCase() === tag.toLowerCase())
}
