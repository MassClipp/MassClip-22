/**
 * Types for the category system
 */

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  isActive: boolean
  order: number
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
