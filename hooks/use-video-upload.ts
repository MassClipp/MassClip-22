"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"

interface UploadOptions {
  title: string
  description?: string
  isPremium: boolean
  file: File
  onProgress?: (progress: number) => void
  onComplete?: (data: any) => void
  onError?: (error: Error) => void
}

export function useVideoUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const { user, getIdToken } = useAuth()
  const { toast } = useToast()

  const uploadVideo = async ({
    title,
    description = "",
    isPremium,
    file,
    onProgress,
    onComplete,
    onError,
  }: UploadOptions) => {
    if (!user) {
      const error = new Error("You must be logged in to upload videos")
      if (onError) onError(error)
      toast({
        title: "Authentication Error",
        description: "You must be logged in to upload videos",
        variant: "destructive",
      })
      return
    }

    try {
      setIsUploading(true)
      setProgress(0)

      // Step 1: Get a pre-signed URL
      const token = await getIdToken()
      const presignedResponse = await fetch("/api/upload/presigned-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          isPremium,
        }),
      })

      if (!presignedResponse.ok) {
        const errorData = await presignedResponse.json()
        throw new Error(errorData.error || "Failed to get upload URL")
      }

      const { presignedUrl, key, fileId, contentType } = await presignedResponse.json()

      // Step 2: Upload the file directly to R2
      const xhr = new XMLHttpRequest()
      xhr.open("PUT", presignedUrl, true)
      xhr.setRequestHeader("Content-Type", file.type)

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100)
          setProgress(percentComplete)
          if (onProgress) onProgress(percentComplete)
        }
      })

      // Create a promise to handle the XHR upload
      const uploadPromise = new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`))
          }
        }
        xhr.onerror = () => {
          reject(new Error("Network error during upload"))
        }
      })

      // Start the upload
      xhr.send(file)
      await uploadPromise

      // Step 3: Save metadata to Firestore
      const metadataResponse = await fetch("/api/upload/save-metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
          key,
          fileId,
          contentType,
          duration: 0, // Placeholder
          thumbnailUrl: "", // Placeholder
        }),
      })

      if (!metadataResponse.ok) {
        const errorData = await metadataResponse.json()
        throw new Error(errorData.error || "Failed to save video metadata")
      }

      const result = await metadataResponse.json()

      // Complete!
      setProgress(100)
      toast({
        title: "Upload Complete",
        description: `Your ${isPremium ? "premium" : "free"} video has been uploaded successfully.`,
      })

      if (onComplete) onComplete(result)
      return result
    } catch (error) {
      console.error("Upload error:", error)
      if (onError && error instanceof Error) onError(error)
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  return {
    uploadVideo,
    isUploading,
    progress,
  }
}
