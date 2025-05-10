export interface Category {
  id: string
  name: string
  description: string
  slug: string
  order: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface VideoCategory {
  id: string
  videoId: string
  categoryId: string
  isPrimary: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CategoryWithVideos extends Category {
  videoCount: number
}
