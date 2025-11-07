"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/use-toast"
import { Upload, CheckCircle2, XCircle, RefreshCw } from "lucide-react"
import {
  saveUploadState,
  loadUploadState,
  clearUploadState,
  calculateChunkSize,
  retryWithBackoff,
  type UploadState,
} from "@/lib/upload-utils"

interface ChunkedUploaderProps {
  file: File
  folderId?: string | null
  onComplete: (uploadId: string, fileUrl: string) => void
  onError: (error: string) => void
  onCancel?: () => void
  networkQuality?: "slow" | "fast" | "unknown"
}

export function ChunkedUploader({
  file,
  folderId,
  onComplete,
  onError,
  onCancel,
  networkQuality = "unknown",
}: ChunkedUploaderProps) {
  const { user } = useAuth()
  const { toast } = useToast()

  const [uploadState, setUploadState] = useState<UploadState | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<"idle" | "uploading" | "finalizing" | "completed" | "error">("idle")
  const [error, setError] = useState<string | null>(null)

  // Check for resumable upload on mount
  useEffect(() => {
    // Check if there's a resumable upload for this file
    const existingState = loadUploadState(file.name + file.size)
    if (existingState && existingState.completedChunks.length > 0) {
      const shouldResume = window.confirm(
        `Found an incomplete upload for this file (${existingState.completedChunks.length}/${existingState.totalChunks} chunks uploaded). Resume?`,
      )

      if (shouldResume) {
        setUploadState(existingState)
        const resumeProgress = (existingState.completedChunks.length / existingState.totalChunks) * 100
        setProgress(resumeProgress)
        toast({
          title: "Resuming upload",
          description: `${existingState.completedChunks.length} of ${existingState.totalChunks} chunks already uploaded`,
        })
      } else {
        clearUploadState(file.name + file.size)
      }
    }
  }, [file, toast])

  const startUpload = async () => {
    if (!user) {
      onError("You must be logged in to upload")
      return
    }

    setIsUploading(true)
    setStatus("uploading")
    setError(null)

    try {
      const token = await user.getIdToken()
      const chunkSize = calculateChunkSize(file.size, networkQuality)

      let uploadId: string
      let totalChunks: number

      // Initialize or resume upload
      if (uploadState) {
        // Resume existing upload
        uploadId = uploadState.uploadId
        totalChunks = uploadState.totalChunks
        console.log(`[v0] Resuming upload ${uploadId}`)
      } else {
        // Initialize new upload
        console.log(`[v0] Initializing chunked upload for ${file.name}`)
        const initResponse = await fetch("/api/uploads/chunked/init", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            folderId: folderId || null,
            chunkSize,
          }),
        })

        if (!initResponse.ok) {
          throw new Error("Failed to initialize upload")
        }

        const initData = await initResponse.json()
        uploadId = initData.uploadId
        totalChunks = initData.totalChunks

        // Initialize upload state
        const newState: UploadState = {
          uploadId,
          completedChunks: [],
          totalChunks,
          uploadedBytes: 0,
          totalBytes: file.size,
        }
        setUploadState(newState)
        saveUploadState(newState)
      }

      // Upload chunks
      const completedChunks = uploadState?.completedChunks || []

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        // Skip already uploaded chunks
        if (completedChunks.includes(chunkIndex)) {
          console.log(`[v0] Skipping already uploaded chunk ${chunkIndex}`)
          continue
        }

        // Check if paused
        if (isPaused) {
          console.log(`[v0] Upload paused at chunk ${chunkIndex}`)
          setIsUploading(false)
          return
        }

        const start = chunkIndex * chunkSize
        const end = Math.min(start + chunkSize, file.size)
        const chunk = file.slice(start, end)

        // Get presigned URL for chunk with retry
        const uploadChunk = async () => {
          console.log(`[v0] Uploading chunk ${chunkIndex}/${totalChunks}`)

          const chunkUrlResponse = await fetch("/api/uploads/chunked/chunk-url", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              uploadId,
              chunkIndex,
              chunkSize: chunk.size,
            }),
          })

          if (!chunkUrlResponse.ok) {
            throw new Error(`Failed to get upload URL for chunk ${chunkIndex}`)
          }

          const { uploadUrl } = await chunkUrlResponse.json()

          // Upload chunk to R2
          const uploadResponse = await fetch(uploadUrl, {
            method: "PUT",
            body: chunk,
            headers: {
              "Content-Type": "application/octet-stream",
            },
          })

          if (!uploadResponse.ok) {
            throw new Error(`Failed to upload chunk ${chunkIndex}`)
          }
        }

        // Upload with retry logic
        await retryWithBackoff(uploadChunk, 3, 1000)

        // Update state
        const newCompletedChunks = [...completedChunks, chunkIndex]
        const newUploadedBytes = newCompletedChunks.length * chunkSize
        const newProgress = (newCompletedChunks.length / totalChunks) * 100

        const newState: UploadState = {
          uploadId,
          completedChunks: newCompletedChunks,
          totalChunks,
          uploadedBytes: newUploadedBytes,
          totalBytes: file.size,
        }

        setUploadState(newState)
        setProgress(newProgress)
        saveUploadState(newState)

        completedChunks.push(chunkIndex)
      }

      // Finalize upload
      setStatus("finalizing")
      console.log(`[v0] Finalizing upload ${uploadId}`)

      const finalizeResponse = await fetch("/api/uploads/chunked/finalize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          uploadId,
          completedChunks,
        }),
      })

      if (!finalizeResponse.ok) {
        throw new Error("Failed to finalize upload")
      }

      const finalData = await finalizeResponse.json()

      // Clear upload state
      clearUploadState(file.name + file.size)

      setStatus("completed")
      setProgress(100)
      setIsUploading(false)

      toast({
        title: "Upload complete!",
        description: `${file.name} uploaded successfully`,
      })

      onComplete(finalData.uploadId, finalData.fileUrl)
    } catch (error) {
      console.error("[v0] Upload error:", error)
      const errorMessage = error instanceof Error ? error.message : "Upload failed"
      setError(errorMessage)
      setStatus("error")
      setIsUploading(false)
      onError(errorMessage)
    }
  }

  const pauseUpload = () => {
    setIsPaused(true)
    toast({
      title: "Upload paused",
      description: "You can resume this upload later",
    })
  }

  const resumeUpload = () => {
    setIsPaused(false)
    startUpload()
  }

  const cancelUpload = () => {
    setIsPaused(false)
    setIsUploading(false)
    setStatus("idle")
    if (uploadState) {
      clearUploadState(file.name + file.size)
    }
    onCancel?.()
  }

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-zinc-400">{status === "finalizing" ? "Finalizing..." : `Uploading ${file.name}`}</span>
          <span className="text-zinc-400">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
        {uploadState && (
          <div className="text-xs text-zinc-500 mt-1">
            Chunk {uploadState.completedChunks.length} of {uploadState.totalChunks}
          </div>
        )}
      </div>

      {/* Status Messages */}
      {status === "completed" && (
        <div className="flex items-center gap-2 text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm">Upload completed successfully!</span>
        </div>
      )}

      {status === "error" && error && (
        <div className="flex items-center gap-2 text-red-400">
          <XCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {!isUploading && status !== "completed" && (
          <Button onClick={startUpload} disabled={status === "completed"} className="flex-1">
            {uploadState && uploadState.completedChunks.length > 0 ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Resume Upload
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Start Upload
              </>
            )}
          </Button>
        )}

        {isUploading && !isPaused && (
          <>
            <Button onClick={pauseUpload} variant="outline" className="flex-1 bg-transparent">
              Pause
            </Button>
            <Button onClick={cancelUpload} variant="destructive" className="flex-1">
              Cancel
            </Button>
          </>
        )}

        {isPaused && (
          <>
            <Button onClick={resumeUpload} className="flex-1">
              <RefreshCw className="mr-2 h-4 w-4" />
              Resume
            </Button>
            <Button onClick={cancelUpload} variant="destructive" className="flex-1">
              Cancel
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
