// Implementation using the tus-js-client for reliable resumable uploads
import * as tus from "tus-js-client"

export async function tusUploadToVimeo({
  file,
  uploadUrl,
  onProgress,
  onError,
  onSuccess,
  onStalled,
}: {
  file: File
  uploadUrl: string
  onProgress?: (progress: number) => void
  onError?: (error: Error) => void
  onSuccess?: (response: any) => void
  onStalled?: () => void
}) {
  return new Promise((resolve, reject) => {
    console.log("Starting TUS upload to Vimeo:", {
      fileSize: file.size,
      fileName: file.name,
      fileType: file.type,
      uploadUrl: uploadUrl.substring(0, 50) + "...", // Log partial URL for privacy
    })

    // Create a new tus upload
    const upload = new tus.Upload(file, {
      endpoint: uploadUrl,
      retryDelays: [0, 3000, 5000, 10000, 20000], // Retry with increasing delays
      metadata: {
        filename: file.name,
        filetype: file.type,
      },
      // Called when upload progress occurs
      onProgress: (bytesUploaded, bytesTotal) => {
        const percentage = (bytesUploaded / bytesTotal) * 100
        console.log(`TUS Upload progress: ${percentage.toFixed(2)}% (${bytesUploaded}/${bytesTotal} bytes)`)
        if (onProgress) {
          onProgress(percentage)
        }
      },
      // Called when the upload is completed
      onSuccess: () => {
        console.log("TUS Upload completed successfully")
        if (onSuccess) {
          onSuccess({ url: upload.url })
        }
        resolve({ url: upload.url })
      },
      // Called when an error occurs
      onError: (error) => {
        console.error("TUS Upload error:", error)
        if (onError) {
          onError(error)
        }
        reject(error)
      },
      // Called when the upload is stalled
      onShouldRetry: (err, retryAttempt, options) => {
        console.warn(`TUS Upload stalled, retry attempt ${retryAttempt}:`, err)
        if (onStalled && retryAttempt > 0) {
          onStalled()
        }
        // Always retry
        return true
      },
    })

    // Check if there are any previous uploads to continue
    upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length) {
        console.log("Found previous upload, attempting to resume...")
        upload.resumeFromPreviousUpload(previousUploads[0])
      }

      // Start the upload
      console.log("Starting TUS upload...")
      upload.start()
    })
  })
}
