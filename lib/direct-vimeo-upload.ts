// A simpler direct upload implementation for Vimeo
export async function directUploadToVimeo({
  file,
  uploadUrl,
  onProgress,
  onError,
}: {
  file: File
  uploadUrl: string
  onProgress?: (progress: number) => void
  onError?: (error: Error) => void
}) {
  try {
    // Create a FormData object to send the file
    const formData = new FormData()
    formData.append("file_data", file)

    // Use the Fetch API to upload the file
    const xhr = new XMLHttpRequest()

    // Set up progress tracking
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percentComplete = (event.loaded / event.total) * 100
        onProgress(percentComplete)
      }
    }

    // Create a promise to handle the XHR request
    return new Promise((resolve, reject) => {
      xhr.open("POST", uploadUrl, true)

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.responseText)
        } else {
          const error = new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`)
          if (onError) onError(error)
          reject(error)
        }
      }

      xhr.onerror = () => {
        const error = new Error("Network error during upload")
        if (onError) onError(error)
        reject(error)
      }

      xhr.send(formData)
    })
  } catch (error) {
    if (onError && error instanceof Error) {
      onError(error)
    }
    throw error
  }
}
