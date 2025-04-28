/**
 * Checks if a date is within the last 30 days
 * @param date The date to check
 * @returns boolean indicating if the date is within the last 30 days
 */
export function isWithinLast30Days(date: Date): boolean {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  return date >= thirtyDaysAgo
}

/**
 * Gets videos that were added in the last 30 days
 * @param videos Array of videos with dateAdded property
 * @returns Array of videos added in the last 30 days
 */
export function getRecentlyAddedVideos(videos: any[]): any[] {
  return videos.filter((video) => {
    // If the video has a dateAdded property, use it
    if (video.dateAdded) {
      return isWithinLast30Days(new Date(video.dateAdded))
    }

    // Otherwise, assume it's not recently added
    return false
  })
}
