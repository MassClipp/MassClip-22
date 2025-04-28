/**
 * Utility functions for handling dates and filtering videos by date
 */

/**
 * Filter videos to only include those added in the last 30 days
 * @param videos Array of videos with dateAdded property
 * @returns Array of videos added in the last 30 days
 */
export function getRecentlyAddedVideos(videos: any[]): any[] {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  return videos.filter((video) => {
    // If the video has a dateAdded property and it's a valid date
    if (video.dateAdded && video.dateAdded instanceof Date) {
      return video.dateAdded >= thirtyDaysAgo
    }

    // If the video has a dateAdded property as a string
    if (video.dateAdded && typeof video.dateAdded === "string") {
      const date = new Date(video.dateAdded)
      if (!isNaN(date.getTime())) {
        return date >= thirtyDaysAgo
      }
    }

    // Default to false if no valid date is found
    return false
  })
}

/**
 * Format a date to a readable string
 * @param date Date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date)
}

/**
 * Get a relative time string (e.g., "2 days ago")
 * @param date Date to get relative time for
 * @returns Relative time string
 */
export function getRelativeTimeString(date: Date): string {
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

  if (diffInDays === 0) {
    return "Today"
  } else if (diffInDays === 1) {
    return "Yesterday"
  } else if (diffInDays < 30) {
    return `${diffInDays} days ago`
  } else {
    return formatDate(date)
  }
}
