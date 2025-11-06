import type { VimeoVideo } from "@/lib/types"

// Function to check if a video matches a search query
export function videoMatchesSearch(video: VimeoVideo, searchQuery: string): boolean {
  if (!searchQuery.trim()) return true

  const query = searchQuery.toLowerCase().trim()

  // Check video name
  if (video.name?.toLowerCase().includes(query)) return true

  // Check video description
  if (video.description?.toLowerCase().includes(query)) return true

  // Check video tags
  if (video.tags && video.tags.length > 0) {
    if (video.tags.some((tag) => tag.name.toLowerCase().includes(query))) return true
  }

  // Check user/creator name
  if (video.user?.name?.toLowerCase().includes(query)) return true

  // Check categories if available
  if (video.categories && video.categories.length > 0) {
    if (video.categories.some((category) => category.name.toLowerCase().includes(query))) return true
  }

  // Check for specific people mentions in description or title
  const commonPeople = [
    "eric thomas",
    "gary vee",
    "gary vaynerchuk",
    "tony robbins",
    "simon sinek",
    "les brown",
    "jim rohn",
    "david goggins",
    "mel robbins",
    "jay shetty",
  ]

  // If the search query matches or partially matches a known person
  if (commonPeople.some((person) => person.includes(query) || query.includes(person))) {
    // Check if the video content might be related to this person
    const videoText = `${video.name || ""} ${video.description || ""}`.toLowerCase()
    return commonPeople.some((person) => {
      if (person.includes(query) || query.includes(person)) {
        return videoText.includes(person)
      }
      return false
    })
  }

  return false
}

// Function to filter videos based on search query
export function filterVideosBySearch(videos: VimeoVideo[], searchQuery: string): VimeoVideo[] {
  if (!searchQuery.trim()) return videos
  return videos.filter((video) => videoMatchesSearch(video, searchQuery))
}

// Function to filter video categories based on search query
export function filterCategoriesBySearch(
  videosByTag: Record<string, VimeoVideo[]>,
  searchQuery: string,
): Record<string, VimeoVideo[]> {
  if (!searchQuery.trim()) return videosByTag

  const query = searchQuery.toLowerCase().trim()
  const filteredCategories: Record<string, VimeoVideo[]> = {}

  // First, check if any category names match the search
  Object.keys(videosByTag).forEach((category) => {
    if (category.toLowerCase().includes(query)) {
      filteredCategories[category] = videosByTag[category]
    }
  })

  // Then, check for videos within categories that match the search
  Object.keys(videosByTag).forEach((category) => {
    if (!filteredCategories[category]) {
      const matchingVideos = videosByTag[category].filter((video) => videoMatchesSearch(video, query))
      if (matchingVideos.length > 0) {
        filteredCategories[category] = matchingVideos
      }
    }
  })

  return filteredCategories
}
