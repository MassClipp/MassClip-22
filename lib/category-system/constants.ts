/**
 * Constants for the category system
 */

// Standard categories that are available in the system
export const STANDARD_CATEGORIES = [
  {
    id: "hustle-mentality",
    name: "Hustle Mentality",
    slug: "hustle-mentality",
    description: "Content focused on hustle culture and work ethic",
    isActive: true,
    order: 10,
  },
  {
    id: "money-and-wealth",
    name: "Money & Wealth",
    slug: "money-and-wealth",
    description: "Content about financial success and wealth building",
    isActive: true,
    order: 20,
  },
  {
    id: "introspection",
    name: "Introspection",
    slug: "introspection",
    description: "Content focused on self-reflection and personal growth",
    isActive: true,
    order: 30,
  },
  {
    id: "faith",
    name: "Faith",
    slug: "faith",
    description: "Content related to spirituality and faith",
    isActive: true,
    order: 40,
  },
  {
    id: "high-energy-motivation",
    name: "High Energy Motivation",
    slug: "high-energy-motivation",
    description: "Energetic motivational content",
    isActive: true,
    order: 50,
  },
  {
    id: "motivational-speeches",
    name: "Motivational Speeches",
    slug: "motivational-speeches",
    description: "Inspirational speeches and talks",
    isActive: true,
    order: 60,
  },
]

// Map between showcase IDs and category IDs (for admin uploads)
export const SHOWCASE_TO_CATEGORY_MAP: Record<string, string> = {
  // Add your showcase ID to category ID mappings here
  // Example: "12345": "hustle-mentality",
}

// Map between category IDs and showcase IDs (for backward compatibility)
export const CATEGORY_TO_SHOWCASE_MAP: Record<string, string> = {
  // This is the inverse of SHOWCASE_TO_CATEGORY_MAP
  // Will be populated automatically
}

// Populate CATEGORY_TO_SHOWCASE_MAP
Object.entries(SHOWCASE_TO_CATEGORY_MAP).forEach(([showcaseId, categoryId]) => {
  CATEGORY_TO_SHOWCASE_MAP[categoryId] = showcaseId
})
