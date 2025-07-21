/**
 * Formats a file size in bytes to a human-readable string
 * @param bytes The file size in bytes
 * @returns A formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes?: number): string {
  if (bytes === undefined || bytes === null) return ""
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

/**
 * Converts a duration in seconds to a human-readable string (hh:mm:ss or mm:ss).
 * @param seconds The duration in seconds.
 * @returns A formatted duration string.
 */
export function formatDuration(seconds?: number): string {
  if (seconds === undefined || seconds === null || Number.isNaN(seconds)) {
    return "0:00"
  }

  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  const parts = [
    hrs > 0 ? String(hrs) : null,
    String(mins).padStart(hrs > 0 ? 2 : 1, "0"),
    String(secs).padStart(2, "0"),
  ].filter(Boolean)

  return parts.join(":")
}
