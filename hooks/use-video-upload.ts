"use client"

import { useState } from "react"
import { generateUniqueFilename, validateVideoFile, generateR2Url } from "@/lib/upload-utils"
import { toast } from "@/hooks/use-toast"

interface UploadState {
  isUploading: boolean
  progress: number
  error: string | null
  uploadedFile: {
    name: string
    url: string
    size: number
  } | null
}

export function useVideoUpload() {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    uploadedFile: null,
  })

  const uploadVideo = async (file: File) => {
    // Validate the file
    const validation = validateVideoFile(file)
    if (!validation.valid) {
      toast({
        title: "Upload Error",
        description: validation.error,
        variant: "destructive",
      })
      setUploadState((prev) => ({ ...prev, error: validation.error || "Invalid file" }))
      return null
    }

    // Generate a unique filename
    const uniqueFilename = generateUniqueFilename(file.name)
    const r2Url = generateR2Url(uniqueFilename)

    setUploadState({
      isUploading: true,
      progress: 0,
      error: null,
      uploadedFile: null,
    })

    try {
      // In a real implementation, you would use a direct upload to R2
      // For this example, we'll simulate the upload with a delay

      // Simulate upload progress
      const totalTime = 3000 // 3 seconds for simulation
      const interval = 100 // Update every 100ms
      const steps = totalTime / interval

      for (let i = 1; i <= steps; i++) {
        await new Promise((resolve) => setTimeout(resolve, interval))
        const progress = Math.min(Math.round((i / steps) * 100), 99)
        setUploadState((prev) => ({ ...prev, progress }))
      }

      // Simulate successful upload
      setUploadState({
        isUploading: false,
        progress: 100,
        error: null,
        uploadedFile: {
          name: uniqueFilename,
          url: r2Url,
          size: file.size,
        },
      })

      toast({
        title: "Upload Complete",
        description: "Your video has been uploaded successfully.",
      })

      return {
        name: uniqueFilename,
        url: r2Url,
        size: file.size,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to upload video"

      setUploadState({
        isUploading: false,
        progress: 0,
        error: errorMessage,
        uploadedFile: null,
      })

      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      })

      return null
    }
  }

  const resetUpload = () => {
    setUploadState({
      isUploading: false,
      progress: 0,
      error: null,
      uploadedFile: null,
    })
  }

  return {
    ...uploadState,
    uploadVideo,
    resetUpload,
  }
}
