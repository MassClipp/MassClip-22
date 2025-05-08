// A basic, reliable Vimeo upload implementation
export async function basicVimeoUpload({
  file,
  uploadUrl,
  onProgress = () => {},
  onError = () => {},
}: {
  file: File
  uploadUrl: string
  onProgress?: (progress: number) => void
  onError?: (error: Error) => void
}) {
  try {
    console.log("Starting basic upload to Vimeo:", {
      fileSize: file.size,
      fileName: file.name,
      fileType: file.type,
    })

    // Create a FormData object to send the file
    const formData = new FormData()
    formData.append("file_data", file)

    // Use XMLHttpRequest for better progress tracking
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      // Set up progress tracking
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100
          console.log(`Upload progress: ${percentComplete.toFixed(2)}%`)
          onProgress(percentComplete)
        }
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          console.log("Upload completed successfully")
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
        const error = new Error("Network error during upload")
        console.error(error)
        onError(error)
        reject(error)
      }

      xhr.onabort = () => {
        const error = new Error("Upload aborted")
        console.error(error)
        onError(error)
        reject(error)
      }

      xhr.ontimeout = () => {
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
    console.error("Error in basicVimeoUpload:", error)
    if (onError && error instanceof Error) {
      onError(error)
    }
    throw error
  }
}
