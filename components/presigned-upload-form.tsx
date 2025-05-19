"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { AlertCircle, Upload, X, Video } from "lucide-react"

export default function PresignedUploadForm() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isPremium, setIsPremium] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()
  const { user } = useAuth()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      console.log("File selected:", files[0].name, files[0].size, files[0].type)

      // Validate file type
      if (!files[0].type.startsWith("video/")) {
        setError("Please select a valid video file")
        return
      }

      // Validate file size (100MB limit)
      if (files[0].size > 100 * 1024 * 1024) {
        setError("File size exceeds 100MB limit")
        return
      }

      setSelectedFile(files[0])
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Form submitted")

    if (!user) {
      console.error("No user logged in")
      setError("You must be logged in to upload videos")
      return
    }

    if (!title.trim()) {
      setError("Please enter a title for your video")
      return
    }

    if (!selectedFile) {
      setError("Please select a video file to upload")
      return
    }

    try {
      setIsUploading(true)
      setError(null)
      console.log("Starting upload process")

      // Step 1: Get a presigned URL
      console.log("Requesting presigned URL")
      const presignedResponse = await fetch("/api/upload/get-presigned-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          isPremium,
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileSize: selectedFile.size,
        }),
      })

      if (!presignedResponse.ok) {
        const errorData = await presignedResponse.json()
        throw new Error(errorData.error || "Failed to get upload URL")
      }

      const { presignedUrl, fileId, key, publicUrl } = await presignedResponse.json()
      console.log("Received presigned URL:", { fileId, key })

      // Step 2: Upload the file directly to R2 using the presigned URL
      console.log("Uploading file to R2 using presigned URL")
      const uploadResponse = await fetch(presignedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": selectedFile.type,
        },
        body: selectedFile,
      })

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed with status ${uploadResponse.status}`)
      }

      console.log("File uploaded successfully to R2")

      // Step 3: Save metadata to Firestore
      console.log("Saving metadata to Firestore")
      const metadataResponse = await fetch("/api/upload/save-metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          isPremium,
          fileId,
          key,
          publicUrl,
          fileType: selectedFile.type,
        }),
      })

      if (!metadataResponse.ok) {
        const errorData = await metadataResponse.json()
        throw new Error(errorData.error || "Failed to save metadata")
      }

      console.log("Metadata saved successfully")

      // Show success message
      alert("Upload successful!")

      // Redirect to the creator's profile
      if (user?.username) {
        window.location.href = `/creator/${user.username}?tab=${isPremium ? "premium" : "free"}`
      } else {
        window.location.href = "/dashboard"
      }
    } catch (error) {
      console.error("Upload error:", error)
      setError(error instanceof Error ? error.message : "An unknown error occurred")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white mb-2">Upload New Video</h1>
        <p className="text-zinc-400">Share your content with your audience</p>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        {/* File Selection */}
        <div className="border-2 border-dashed rounded-lg p-6 text-center border-zinc-700 hover:border-red-500/50">
          {selectedFile ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <Video className="h-10 w-10 text-red-500" />
              </div>
              <div>
                <p className="text-white font-medium">{selectedFile.name}</p>
                <p className="text-zinc-400 text-sm">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="px-3 py-1 text-sm border border-zinc-700 rounded-md text-zinc-400 hover:bg-zinc-800"
              >
                <X className="h-4 w-4 inline mr-2" />
                Remove
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <Upload className="h-10 w-10 text-zinc-500" />
              </div>
              <div>
                <p className="text-white font-medium">Select a video to upload</p>
                <p className="text-zinc-400 text-sm">MP4, MOV up to 100MB</p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white hover:bg-zinc-700"
              >
                Select File
              </button>
              <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
            </div>
          )}
        </div>

        {/* Title & Description */}
        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-white mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for your video"
              className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-md text-white"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-white mb-1">
              Description <span className="text-zinc-400">(optional)</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description for your video"
              className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-md text-white h-24"
            />
          </div>
        </div>

        {/* Premium Toggle */}
        <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-lg border border-zinc-800">
          <div>
            <h3 className="text-white font-medium">Premium Content</h3>
            <p className="text-zinc-400 text-sm">
              {isPremium
                ? "This video will only be available to paying subscribers"
                : "This video will be available to everyone for free"}
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isPremium}
              onChange={(e) => setIsPremium(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
          </label>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 text-red-500 bg-red-500/10 p-3 rounded-md">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-2">
            <div className="w-full bg-zinc-700 rounded-full h-2.5">
              <div className="bg-red-500 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
            </div>
            <p className="text-zinc-400 text-sm text-center">
              {uploadProgress < 100 ? `Uploading: ${uploadProgress}%` : "Processing..."}
            </p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-4 py-2 border border-zinc-700 rounded-md text-white hover:bg-zinc-800"
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-red-500 rounded-md text-white hover:bg-red-600 disabled:opacity-50"
            disabled={isUploading || !selectedFile || !title.trim()}
          >
            {isUploading ? "Uploading..." : "Upload Video"}
          </button>
        </div>
      </form>
    </div>
  )
}
