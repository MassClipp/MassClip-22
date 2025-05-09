// Super simple direct upload implementation
export async function superSimpleUpload(file: File, uploadUrl: string, onProgress: (progress: number) => void) {
  return new Promise<void>((resolve, reject) => {
    console.log("Starting super simple upload to:", uploadUrl)
    console.log("File details:", { name: file.name, size: file.size, type: file.type })

    // Use XMLHttpRequest for direct upload with progress
    const xhr = new XMLHttpRequest()

    // Set up progress tracking
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100
        console.log(`Upload progress: ${percentComplete.toFixed(2)}% (${event.loaded}/${event.total} bytes)`)
        onProgress(percentComplete)
      }
    }

    // Set up completion handler
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        console.log("Upload completed successfully")
        resolve()
      } else {
        const error = new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`)
        console.error(error)
        reject(error)
      }
    }

    // Set up error handler
    xhr.onerror = () => {
      const error = new Error("Network error during upload")
      console.error(error)
      reject(error)
    }

    // Open and send the request
    xhr.open("PUT", uploadUrl, true)
    xhr.setRequestHeader("Content-Type", "application/octet-stream")
    xhr.setRequestHeader("Tus-Resumable", "1.0.0")
    xhr.send(file)
  })
}
