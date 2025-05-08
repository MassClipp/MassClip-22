// A simplified, reliable approach to Vimeo uploads
import * as tus from "tus-js-client"

interface SimpleUploadOptions {
  file: File
  uploadUrl: string
  onProgress?: (progress: number) => void
  onSuccess?: (response: any) => void
  onError?: (error: Error) => void
}

export async function simpleVimeoUpload({
  file,
  uploadUrl,
  onProgress = () => {},
  onSuccess = () => {},
  onError = () => {},
}: SimpleUploadOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    // Basic validation
    if (!file) {
      const error = new Error("No file provided for upload")
      onError(error)
      return reject(error)
    }

    if (!uploadUrl) {
      const error = new Error("No upload URL provided")
      onError(error)
      return reject(error)
    }

    console.log("Starting simple Vimeo upload:", {
      fileName: file.name,
      fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      fileType: file.type,
    })

    // Create a new tus upload with minimal configuration
    const upload = new tus.Upload(file, {
      endpoint: uploadUrl,
      retryDelays: [0, 1000, 3000, 5000, 10000],
      metadata: {
        filename: file.name,
        filetype: file.type,
      },
      onError: (error) => {
        console.error("Upload error:", error)
        onError(error)
        reject(error)
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const percentage = (bytesUploaded / bytesTotal) * 100
        console.log(`Upload progress: ${percentage.toFixed(2)}%`)
        onProgress(percentage)
      },
      onSuccess: () => {
        console.log("Upload completed successfully")
        onSuccess(upload.url)
        resolve()
      },
    })

    // Start the upload
    upload.start()
  })
}

// Fallback method using XMLHttpRequest for direct upload
export async function fallbackVimeoUpload({
  file,
  uploadUrl,
  onProgress = () => {},
  onError = () => {},
}: SimpleUploadOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log("Starting fallback upload using XMLHttpRequest")

    const xhr = new XMLHttpRequest()

    xhr.open("PUT", uploadUrl, true)
    xhr.setRequestHeader("Content-Type", file.type)
    xhr.setRequestHeader("Tus-Resumable", "1.0.0")

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percentage = (e.loaded / e.total) * 100
        console.log(`Fallback upload progress: ${percentage.toFixed(2)}%`)
        onProgress(percentage)
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        console.log("Fallback upload completed successfully")
        resolve()
      } else {
        const error = new Error(`Upload failed with status ${xhr.status}`)
        console.error(error)
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

    xhr.send(file)
  })
}
