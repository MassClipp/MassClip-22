/**
 * Validates if a file is an MP4 and under the size limit
 */
export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  // Check if file is an MP4
  if (!file.type.includes("mp4")) {
    return { valid: false, error: "Only MP4 files are allowed" }
  }

  // Check file size (300MB = 300 * 1024 * 1024 bytes)
  const maxSize = 300 * 1024 * 1024
  if (file.size > maxSize) {
    return { valid: false, error: "File size must be under 300MB" }
  }

  return { valid: true }
}

/**
 * Formats bytes to a human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

/**
 * Generates a unique filename for the uploaded video
 */
export function generateUniqueFilename(originalFilename: string): string {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 8)
  const extension = originalFilename.split(".").pop()

  return `video-${timestamp}-${randomString}.${extension}`
}

/**
 * Formats tags from a comma-separated string to an array
 */
export function formatTags(tagsString: string): string[] {
  return tagsString
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag !== "")
}

/**
 * Generates the Cloudflare R2 URL for a file
 */
export function generateR2Url(filename: string): string {
  return `https://pub-0b3ce0bc519f469c81f8ed504a1ee451.r2.dev/${filename}`
}
