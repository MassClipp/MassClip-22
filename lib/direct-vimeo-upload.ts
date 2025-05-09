// A more robust direct upload implementation for Vimeo
export async function directUploadToVimeo({
  file,
  uploadUrl,
  onProgress,
  onError,
  onStalled,
}: {
  file: File
  uploadUrl: string
  onProgress?: (progress: number) => void
  onError?: (error: Error) => void
  onStalled?: () => void
}) {
  try {
    console.log("Starting direct upload to Vimeo:", {
      fileSize: file.size,
      fileName: file.name,
      fileType: file.type,
      uploadUrl: uploadUrl.substring(0, 50) + "...", // Log partial URL for privacy
    })

    // Create a FormData object to send the file
    const formData = new FormData()
    formData.append("file_data", file)

    // Use XMLHttpRequest for better control over the upload process
    const xhr = new XMLHttpRequest()

    // Track upload progress and stalling
    let lastProgress = 0
    let stallTimer: NodeJS.Timeout | null = null
    let lastProgressTime = Date.now()

    // Set up progress tracking
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percentage = (event.loaded / event.total) * 100
        console.log(`Upload progress: ${percentage.toFixed(2)}% (${event.loaded}/${event.total} bytes)`)
        onProgress(percentage)

        // Check for stalled upload
        if (percentage > lastProgress) {
          lastProgress = percentage
          lastProgressTime = Date.now()

          // Clear stall timer if we're making progress
          if (stallTimer) {
            clearTimeout(stallTimer)
            stallTimer = null
          }
        }

        // Set a timer to detect stalled uploads
        if (!stallTimer && percentage < 100 && percentage > 0) {
          stallTimer = setTimeout(() => {
            console.warn("Upload appears to be stalled, attempting to resume...")
            if (onStalled) onStalled()

            // Try to abort and restart the upload
            try {
              xhr.abort()
              directUploadToVimeo({
                file,
                uploadUrl,
                onProgress,
                onError,
                onStalled,
              })
            } catch (e) {
              console.error("Failed to restart stalled upload:", e)
            }
          }, 30000) // 30 seconds without progress is considered stalled
        }
      }
    }

    // Create a promise to handle the XHR request
    return new Promise((resolve, reject) => {
      xhr.open("POST", uploadUrl, true)

      // Add timeout handling
      xhr.timeout = 3600000 // 1 hour timeout
      xhr.ontimeout = () => {
        const error = new Error("Upload timed out after 1 hour")
        console.error(error)
        if (onError) onError(error)
        reject(error)
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          console.log("Upload completed successfully with status:", xhr.status)
          if (stallTimer) clearTimeout(stallTimer)
          resolve(xhr.responseText)
        } else {
          const error = new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`)
          console.error(error)
          console.error("Response:", xhr.responseText)
          if (onError) onError(error)
          reject(error)
        }
      }

      xhr.onerror = () => {
        const error = new Error("Network error during upload")
        console.error(error)
        if (onError) onError(error)
        reject(error)
      }

      xhr.onabort = () => {
        console.log("Upload was aborted")
      }

      // Log when upload starts
      console.log("Sending upload request to Vimeo...")
      xhr.send(formData)
    })
  } catch (error) {
    console.error("Error in directUploadToVimeo:", error)
    if (onError && error instanceof Error) {
      onError(error)
    }
    throw error
  }
}
