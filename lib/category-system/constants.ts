/**
 * Predefined categories and configuration
 */

import type { Category } from "./types"

// Standard categories that are available in the system
export const STANDARD_CATEGORIES: Omit<Category, "createdAt" | "updatedAt">[] = [
  {
    id: "hustle-mentality",
    name: "Hustle Mentality",
    slug: "hustle-mentality",
    description: "Videos about hustle culture, work ethic, and grinding to success",
    isActive: true,
    order: 1,
  },
  {
    id: "money-and-wealth",
    name: "Money & Wealth",
    slug: "money-and-wealth",
    description: "Content related to finance, wealth building, and money management",
    isActive: true,
    order: 2,
  },
  {
    id: "introspection",
    name: "Introspection",
    slug: "introspection",
    description: "Thoughtful content about self-reflection and personal growth",
    isActive: true,
    order: 3,
  },
  {
    id: "faith",
    name: "Faith",
    slug: "faith",
    description: "Spiritual and faith-based motivational content",
    isActive: true,
    order: 4,
  },
  {
    id: "high-energy-motivation",
    name: "High Energy Motivation",
    slug: "high-energy-motivation",
    description: "Energetic and intense motivational videos",
    isActive: true,
    order: 5,
  },
  {
    id: "motivational-speeches",
    name: "Motivational Speeches",
    slug: "motivational-speeches",
    description: "Inspirational speeches and talks from motivational speakers",
    isActive: true,
    order: 6,
  },
]

// Legacy showcase ID to category ID mapping
export const SHOWCASE_TO_CATEGORY_MAP: Record<string, string> = {
  "12345678": "hustle-mentality", // Replace with actual showcase IDs
  "23456789": "money-and-wealth",
  "34567890": "introspection",
  "45678901": "faith",
  "56789012": "high-energy-motivation",
  "67890123": "motivational-speeches",
}

// Category ID to showcase ID mapping (reverse of above)
export const CATEGORY_TO_SHOWCASE_MAP: Record<string, string> = Object.entries(SHOWCASE_TO_CATEGORY_MAP).reduce(
  (acc, [showcaseId, categoryId]) => {
    acc[categoryId] = showcaseId
    return acc
  },
  {} as Record<string, string>,
)
