import type { Category } from "./types"

// Standard categories for the app
export const STANDARD_CATEGORIES: Omit<Category, "createdAt" | "updatedAt">[] = [
  {
    id: "hustle-mentality",
    name: "Hustle Mentality",
    description: "Content focused on hustle culture, grinding, and work ethic",
    slug: "hustle-mentality",
    order: 10,
    isActive: true,
  },
  {
    id: "money-and-wealth",
    name: "Money & Wealth",
    description: "Content about financial success, wealth building, and money management",
    slug: "money-and-wealth",
    order: 20,
    isActive: true,
  },
  {
    id: "introspection",
    name: "Introspection",
    description: "Content focused on self-reflection, mindfulness, and personal growth",
    slug: "introspection",
    order: 30,
    isActive: true,
  },
  {
    id: "faith",
    name: "Faith",
    description: "Content related to spirituality, religion, and faith-based motivation",
    slug: "faith",
    order: 40,
    isActive: true,
  },
  {
    id: "high-energy-motivation",
    name: "High Energy Motivation",
    description: "Energetic and intense motivational content",
    slug: "high-energy-motivation",
    order: 50,
    isActive: true,
  },
  {
    id: "motivational-speeches",
    name: "Motivational Speeches",
    description: "Inspirational talks and speeches from motivational speakers",
    slug: "motivational-speeches",
    order: 60,
    isActive: true,
  },
]

// Map between showcase IDs and category IDs (for admin uploads)
export const SHOWCASE_TO_CATEGORY_MAP: Record<string, string> = {
  // This is empty by default, but can be populated as needed
  // Example: "12345": "hustle-mentality",
}

// Map between category IDs and showcase IDs (for backward compatibility)
export const CATEGORY_TO_SHOWCASE_MAP: Record<string, string> = {
  // This is the inverse of SHOWCASE_TO_CATEGORY_MAP
  // Will be populated automatically
}

// Populate CATEGORY_TO_SHOWCASE_MAP based on SHOWCASE_TO_CATEGORY_MAP
Object.entries(SHOWCASE_TO_CATEGORY_MAP).forEach(([showcaseId, categoryId]) => {
  CATEGORY_TO_SHOWCASE_MAP[categoryId] = showcaseId
})
