import * as tus from "tus-js-client"

interface UploadOptions {
  file: File
  uploadUrl: string
  onProgress?: (progress: number) => void
  onSuccess?: (response: any) => void
  onError?: (error: Error) => void
  onStalled?: () => void
}

export async function resumableUploadToVimeo({
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
    console.log("Starting TUS resumable upload to:", uploadUrl)
    console.log("File details:", {
      name: file.name,
      size: file.size,
      type: file.type,
    })

    // Track stalled uploads
    let lastProgress = 0
    let lastProgressTime = Date.now()
    let lastProgressBytes = 0
    let stalledTimer: NodeJS.Timeout | null = null
    let progressReported = false

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
        const now = Date.now()
        const percentage = (bytesUploaded / bytesTotal) * 100
        const timeSinceLastProgress = now - lastProgressTime
        const bytesSinceLastProgress = bytesUploaded - lastProgressBytes

        // Calculate upload speed
        const uploadSpeedKBps =
          timeSinceLastProgress > 0 ? bytesSinceLastProgress / 1024 / (timeSinceLastProgress / 1000) : 0

        console.log(
          `Upload progress: ${percentage.toFixed(2)}% (${bytesUploaded}/${bytesTotal} bytes) - Speed: ${uploadSpeedKBps.toFixed(2)} KB/s`,
        )

        progressReported = true

        // Check if progress is actually happening
        if (percentage > lastProgress) {
          lastProgress = percentage
          lastProgressTime = now
          lastProgressBytes = bytesUploaded

          // Reset stalled timer if we're making progress
          if (stalledTimer) {
            clearTimeout(stalledTimer)
            stalledTimer = null
          }
        }

        // Set a timer to detect stalled uploads
        if (!stalledTimer && percentage < 100 && percentage > 0) {
          stalledTimer = setTimeout(() => {
            console.warn("Upload appears to be stalled, attempting to resume...")
            try {
              upload.abort()
              setTimeout(() => {
                upload.start()
              }, 1000)
              onStalled()
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

    // Set a timeout to detect if the upload never starts
    const initialProgressTimeout = setTimeout(() => {
      if (!progressReported) {
        console.warn("Upload appears to be stalled - no initial progress reported")
        onStalled()
      }
    }, 10000) // 10 seconds without any progress is concerning

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

        // Clear the initial progress timeout once the upload starts
        setTimeout(() => {
          clearTimeout(initialProgressTimeout)
        }, 15000)
      })
      .catch((err) => {
        console.error("Error finding previous uploads:", err)
        clearTimeout(initialProgressTimeout)
        upload.start()
      })
  })
}
