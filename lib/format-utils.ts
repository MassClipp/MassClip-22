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
 * Formats a duration (in seconds) into a human-readable string.
 *  - For durations &lt; 1 hour it returns M:SS (e.g. "3:07")
 *  - For durations ≥ 1 hour it returns H:MM:SS (e.g. "1:02:45")
 */
export function formatDuration(seconds?: number): string {
  if (seconds === undefined || seconds === null || Number.isNaN(seconds)) return ""

  const total = Math.floor(seconds)
  const hrs = Math.floor(total / 3600)
  const mins = Math.floor((total % 3600) / 60)
  const secs = total % 60

  const pad = (n: number) => n.toString().padStart(2, "0")

  return hrs > 0 ? `${hrs}:${pad(mins)}:${pad(secs)}` : `${mins}:${pad(secs)}`
}
