// A simpler direct upload implementation for Vimeo
export async function directUploadToVimeo({
  file,
  uploadUrl,
  onProgress = () => {},
  onError = () => {},
  onStalled = () => {},
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
      uploadUrl: uploadUrl.substring(0, 50) + "...", // Truncate for logging
    })

    // Create a FormData object to send the file
    const formData = new FormData()
    formData.append("file_data", file)

    // Use XMLHttpRequest for better progress tracking
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      // Track upload timing for debugging
      const startTime = Date.now()
      let lastProgressTime = startTime
      let lastProgressBytes = 0
      let progressReported = false

      // Set up progress tracking
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const now = Date.now()
          const percentComplete = (event.loaded / event.total) * 100
          const timeSinceLastProgress = now - lastProgressTime
          const bytesSinceLastProgress = event.loaded - lastProgressBytes

          // Calculate upload speed
          const uploadSpeedKBps =
            timeSinceLastProgress > 0 ? bytesSinceLastProgress / 1024 / (timeSinceLastProgress / 1000) : 0

          // Log detailed progress information
          console.log(
            `Upload progress: ${percentComplete.toFixed(2)}% (${event.loaded}/${event.total} bytes) - Speed: ${uploadSpeedKBps.toFixed(2)} KB/s`,
          )

          // Update tracking variables
          lastProgressTime = now
          lastProgressBytes = event.loaded
          progressReported = true

          // Call the progress callback
          onProgress(percentComplete)
        }
      }

      // Set up a timeout to detect stalled uploads
      const stalledTimeout = setTimeout(() => {
        if (!progressReported) {
          console.warn("Upload appears to be stalled - no progress reported")
          onStalled()
        }
      }, 10000) // 10 seconds without any progress is concerning

      xhr.onload = () => {
        clearTimeout(stalledTimeout)

        if (xhr.status >= 200 && xhr.status < 300) {
          const totalTime = (Date.now() - startTime) / 1000
          console.log(`Upload completed successfully in ${totalTime.toFixed(2)} seconds`)
          resolve()
        } else {
          const error = new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`)
          console.error(error)
          console.error("Response:", xhr.responseText)
          onError(error)
          reject(error)
        }
      }

      xhr.onerror = () => {
        clearTimeout(stalledTimeout)
        const error = new Error("Network error during upload")
        console.error(error)
        onError(error)
        reject(error)
      }

      xhr.onabort = () => {
        clearTimeout(stalledTimeout)
        const error = new Error("Upload aborted")
        console.error(error)
        onError(error)
        reject(error)
      }

      xhr.ontimeout = () => {
        clearTimeout(stalledTimeout)
        const error = new Error("Upload timed out")
        console.error(error)
        onError(error)
        reject(error)
      }

      // Open the connection and send the file
      xhr.open("POST", uploadUrl, true)
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
