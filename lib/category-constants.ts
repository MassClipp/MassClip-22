export const NICHE_CATEGORIES = [
  { id: "motivation", label: "Motivation" },
  { id: "sports", label: "Sports" },
  { id: "memes", label: "Memes" },
  { id: "streamers", label: "Streamers" },
  { id: "funny", label: "Funny" },
  { id: "other", label: "Other" },
]

// Helper function to get category label by ID
export function getCategoryLabel(id: string): string {
  const category = NICHE_CATEGORIES.find((cat) => cat.id === id)
  return category ? category.label : id.charAt(0).toUpperCase() + id.slice(1)
}

// Helper function to normalize category names for comparison
export function normalizeCategory(category: string): string {
  return category.trim().toLowerCase().replace(/\s+/g, " ")
}
