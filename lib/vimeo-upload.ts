import * as tus from "tus-js-client"

interface UploadOptions {
  file: File
  uploadUrl: string
  onProgress?: (progress: number) => void
  onSuccess?: (response: any) => void
  onError?: (error: Error) => void
}

export async function uploadToVimeo({
  file,
  uploadUrl,
  onProgress = () => {},
  onSuccess = () => {},
  onError = () => {},
}: UploadOptions) {
  return new Promise<void>((resolve, reject) => {
    // Create a new tus upload
    const upload = new tus.Upload(file, {
      endpoint: uploadUrl,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      metadata: {
        filename: file.name,
        filetype: file.type,
      },
      onError: (error) => {
        console.error("Failed to upload to Vimeo:", error)
        onError(error)
        reject(error)
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const percentage = (bytesUploaded / bytesTotal) * 100
        onProgress(percentage)
      },
      onSuccess: () => {
        console.log("Upload to Vimeo completed successfully")
        onSuccess(upload.url)
        resolve()
      },
    })

    // Start the upload
    upload.start()
  })
}
