import * as tus from "tus-js-client"

interface UploadOptions {
  file: File
  uploadUrl: string
  onProgress?: (progress: number) => void
  onSuccess?: (response: any) => void
  onError?: (error: Error) => void
  onStalled?: () => void
}

export async function uploadToVimeo({
  file,
  uploadUrl,
  onProgress = () => {},
  onSuccess = () => {},
  onError = () => {},
  onStalled = () => {},
}: UploadOptions) {
  return new Promise<void>((resolve, reject) => {
    if (!file) {
      const error = new Error("No file provided for upload")
      console.error(error)
      onError(error)
      return reject(error)
    }

    if (!uploadUrl) {
      const error = new Error("No upload URL provided")
      console.error(error)
      onError(error)
      return reject(error)
    }

    // Create a new tus upload
    console.log("Starting TUS upload to:", uploadUrl)
    console.log("File details:", {
      name: file.name,
      size: file.size,
      type: file.type,
    })

    // Track stalled uploads
    let lastProgress = 0
    let stalledTimer: NodeJS.Timeout | null = null
    let lastProgressTime = Date.now()

    const upload = new tus.Upload(file, {
      endpoint: uploadUrl,
      retryDelays: [0, 1000, 3000, 5000, 10000, 20000],
      metadata: {
        filename: file.name,
        filetype: file.type,
      },
      headers: {
        "X-Upload-Content-Type": file.type,
      },
      chunkSize: 5 * 1024 * 1024, // 5MB chunks
      onError: (error) => {
        console.error("Failed to upload to Vimeo:", error)
        if (stalledTimer) clearTimeout(stalledTimer)
        onError(error)
        reject(error)
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const percentage = (bytesUploaded / bytesTotal) * 100
        console.log(`Upload progress: ${percentage.toFixed(2)}% (${bytesUploaded}/${bytesTotal} bytes)`)

        // Check if progress is actually happening
        if (percentage > lastProgress) {
          lastProgress = percentage
          lastProgressTime = Date.now()

          // Reset stalled timer if we're making progress
          if (stalledTimer) {
            clearTimeout(stalledTimer)
            stalledTimer = null
          }
        }

        // Set a timer to detect stalled uploads
        if (!stalledTimer && percentage < 100 && percentage > 0) {
          stalledTimer = setTimeout(() => {
            const timeSinceLastProgress = Date.now() - lastProgressTime
            console.warn(`Upload appears to be stalled for ${timeSinceLastProgress / 1000}s, attempting to resume...`)

            try {
              // Notify about stalled upload
              onStalled()

              // Try to resume by aborting and restarting
              upload.abort()

              setTimeout(() => {
                console.log("Restarting upload after stall...")
                upload.start()
              }, 2000)
            } catch (e) {
              console.error("Failed to resume stalled upload:", e)
            }
          }, 30000) // 30 seconds without progress is considered stalled
        }

        onProgress(percentage)
      },
      onSuccess: () => {
        console.log("Upload to Vimeo completed successfully")
        if (stalledTimer) clearTimeout(stalledTimer)
        onSuccess(upload.url)
        resolve()
      },
      onShouldRetry: (err, retryAttempt, options) => {
        console.log(`Retry attempt ${retryAttempt} due to error:`, err)
        return true // Always retry on error
      },
    })

    // Log upload events for debugging
    upload
      .findPreviousUploads()
      .then((previousUploads) => {
        if (previousUploads.length) {
          console.log("Found previous upload attempt, resuming...")
          upload.resumeFromPreviousUpload(previousUploads[0])
        }

        // Start the upload
        console.log("Starting upload of file:", file.name, "size:", file.size)
        upload.start()
      })
      .catch((err) => {
        console.error("Error finding previous uploads:", err)
        upload.start()
      })
  })
}
