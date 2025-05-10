/**
 * Core types for the categorization system
 */

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  parentId?: string
  order?: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface VideoCategory {
  videoId: string
  categoryId: string
  isPrimary: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CategoryWithVideos extends Category {
  videoCount: number
}

export interface VideoWithCategories {
  videoId: string
  title: string
  description?: string
  thumbnailUrl?: string
  categories: string[] // Category IDs
  primaryCategory?: string // Primary category ID
}

export type CategorySource = "showcase" | "firestore" | "manual"

export interface CategoryAssignment {
  videoId: string
  categoryId: string
  source: CategorySource
  isPrimary: boolean
  createdAt: Date
  updatedAt: Date
}
