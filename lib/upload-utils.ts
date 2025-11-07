// Utility functions for chunked uploads and compression

export const CHUNK_SIZE = 5 * 1024 * 1024 // 5MB chunks
export const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024 // 50MB

export interface UploadState {
  uploadId: string
  completedChunks: number[]
  totalChunks: number
  uploadedBytes: number
  totalBytes: number
}

/**
 * Save upload state to localStorage for resumability
 */
export function saveUploadState(state: UploadState): void {
  try {
    localStorage.setItem(`upload_${state.uploadId}`, JSON.stringify(state))
  } catch (error) {
    console.error("Failed to save upload state:", error)
  }
}

/**
 * Load upload state from localStorage
 */
export function loadUploadState(uploadId: string): UploadState | null {
  try {
    const stateStr = localStorage.getItem(`upload_${uploadId}`)
    if (!stateStr) return null
    return JSON.parse(stateStr) as UploadState
  } catch (error) {
    console.error("Failed to load upload state:", error)
    return null
  }
}

/**
 * Clear upload state from localStorage
 */
export function clearUploadState(uploadId: string): void {
  try {
    localStorage.removeItem(`upload_${uploadId}`)
  } catch (error) {
    console.error("Failed to clear upload state:", error)
  }
}

/**
 * Compress image using canvas
 */
export async function compressImage(file: File, maxWidth = 1920, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      reject(new Error("Failed to get canvas context"))
      return
    }

    img.onload = () => {
      let { width, height } = img

      // Scale down if too large
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }

      canvas.width = width
      canvas.height = height

      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error("Failed to compress image"))
          }
        },
        file.type,
        quality,
      )
    }

    img.onerror = () => reject(new Error("Failed to load image"))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Check if video compression is supported
 */
export function isVideoCompressionSupported(): boolean {
  // Video compression in browser is complex and resource-intensive
  // For now, we'll skip it and only compress on server-side if needed
  return false
}

/**
 * Calculate optimal chunk size based on file size and network
 */
export function calculateChunkSize(fileSize: number, networkQuality: "slow" | "fast" | "unknown"): number {
  if (networkQuality === "slow") {
    // Smaller chunks for slow connections (2MB)
    return 2 * 1024 * 1024
  }

  if (fileSize > 500 * 1024 * 1024) {
    // Larger chunks for huge files (10MB)
    return 10 * 1024 * 1024
  }

  // Default 5MB chunks
  return CHUNK_SIZE
}

/**
 * Retry logic with exponential backoff
 */
export async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3, baseDelay = 1000): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error")

      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt)
        console.log(`[v0] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error("Max retries exceeded")
}
