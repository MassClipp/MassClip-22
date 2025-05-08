/**
 * Chunked Vimeo Upload Implementation
 *
 * This implementation breaks files into smaller chunks and uploads them sequentially.
 * It supports resuming uploads, progress tracking, and manual retry.
 */

// Default chunk size: 5MB
const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024

export interface ChunkedUploadOptions {
  file: File
  uploadUrl: string
  chunkSize?: number
  onProgress?: (progress: number) => void
  onError?: (error: Error) => void
  onStalled?: () => void
  onChunkComplete?: (chunkIndex: number, totalChunks: number) => void
  retryLimit?: number
  retryDelay?: number
}

export interface UploadController {
  pause: () => void
  resume: () => Promise<void>
  cancel: () => void
  getStatus: () => UploadStatus
}

export interface UploadStatus {
  isPaused: boolean
  isCancelled: boolean
  currentChunk: number
  totalChunks: number
  progress: number
  bytesUploaded: number
  bytesTotal: number
}

export async function chunkedUploadToVimeo(options: ChunkedUploadOptions): Promise<UploadController> {
  const {
    file,
    uploadUrl,
    chunkSize = DEFAULT_CHUNK_SIZE,
    onProgress = () => {},
    onError = () => {},
    onStalled = () => {},
    onChunkComplete = () => {},
    retryLimit = 3,
    retryDelay = 2000,
  } = options

  // Upload state
  let isPaused = false
  let isCancelled = false
  let currentChunk = 0
  let bytesUploaded = 0
  const totalChunks = Math.ceil(file.size / chunkSize)

  // Stall detection
  let lastProgressTimestamp = Date.now()
  let stallCheckInterval: NodeJS.Timeout | null = null

  // Create upload controller
  const controller: UploadController = {
    pause: () => {
      console.log("Upload paused manually")
      isPaused = true
    },
    resume: async () => {
      console.log("Resuming upload from chunk", currentChunk)
      isPaused = false
      return uploadChunks()
    },
    cancel: () => {
      console.log("Upload cancelled")
      isCancelled = true
      if (stallCheckInterval) {
        clearInterval(stallCheckInterval)
      }
    },
    getStatus: () => ({
      isPaused,
      isCancelled,
      currentChunk,
      totalChunks,
      progress: (bytesUploaded / file.size) * 100,
      bytesUploaded,
      bytesTotal: file.size,
    }),
  }

  // Start stall detection
  const startStallDetection = () => {
    if (stallCheckInterval) {
      clearInterval(stallCheckInterval)
    }

    lastProgressTimestamp = Date.now()
    stallCheckInterval = setInterval(() => {
      const stallTime = Date.now() - lastProgressTimestamp
      // If no progress for 30 seconds, consider it stalled
      if (stallTime > 30000 && !isPaused && !isCancelled) {
        console.warn("Upload appears to be stalled for", Math.round(stallTime / 1000), "seconds")
        onStalled()
        // Don't auto-retry here, let the UI handle it
      }
    }, 5000)
  }

  // Upload a single chunk with retry logic
  const uploadChunk = async (chunkIndex: number): Promise<boolean> => {
    const start = chunkIndex * chunkSize
    const end = Math.min(start + chunkSize, file.size)
    const chunk = file.slice(start, end)

    let attempts = 0

    while (attempts < retryLimit) {
      try {
        if (isCancelled) return false
        if (isPaused) return false

        attempts++
        console.log(
          `Uploading chunk ${chunkIndex + 1}/${totalChunks} (${(chunk.size / 1024 / 1024).toFixed(2)}MB), attempt ${attempts}`,
        )

        // Create headers for content-range
        const contentRange = `bytes ${start}-${end - 1}/${file.size}`

        // Upload the chunk
        const response = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Range": contentRange,
          },
          body: chunk,
        })

        // Update timestamp on any activity
        lastProgressTimestamp = Date.now()

        if (response.ok || response.status === 308) {
          // Chunk uploaded successfully
          bytesUploaded += chunk.size
          onProgress((bytesUploaded / file.size) * 100)
          onChunkComplete(chunkIndex, totalChunks)
          console.log(`Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully`)
          return true
        } else {
          console.error(`Chunk upload failed with status ${response.status}:`, await response.text())

          if (attempts >= retryLimit) {
            throw new Error(`Failed to upload chunk after ${retryLimit} attempts. Status: ${response.status}`)
          }

          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, retryDelay))
        }
      } catch (error) {
        console.error(`Error uploading chunk ${chunkIndex + 1}:`, error)

        if (attempts >= retryLimit) {
          if (error instanceof Error) {
            onError(error)
          } else {
            onError(new Error("Unknown error during chunk upload"))
          }
          return false
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, retryDelay))
      }
    }

    return false
  }

  // Upload all chunks sequentially
  const uploadChunks = async (): Promise<void> => {
    startStallDetection()

    try {
      while (currentChunk < totalChunks) {
        if (isCancelled) {
          break
        }

        if (isPaused) {
          // Exit the loop if paused, the resume function will call uploadChunks again
          return
        }

        const success = await uploadChunk(currentChunk)
        if (success) {
          currentChunk++
        } else if (!isPaused && !isCancelled) {
          // If not successful and not manually paused/cancelled, there was an error
          throw new Error(`Failed to upload chunk ${currentChunk + 1}`)
        }
      }

      if (stallCheckInterval) {
        clearInterval(stallCheckInterval)
      }

      if (!isCancelled && !isPaused) {
        console.log("All chunks uploaded successfully")
        onProgress(100)
      }
    } catch (error) {
      if (stallCheckInterval) {
        clearInterval(stallCheckInterval)
      }

      console.error("Error in uploadChunks:", error)
      if (error instanceof Error) {
        onError(error)
      } else {
        onError(new Error("Unknown error during upload"))
      }
    }
  }

  // Start the upload process
  uploadChunks()

  return controller
}
