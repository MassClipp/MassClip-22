"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Upload, AlertCircle, CheckCircle, Info, X } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { NicheSelector } from "@/components/niche-selector"

export default function UploadPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [selectedNiches, setSelectedNiches] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.push("/login")
    }
  }, [user, router])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]

      // Check if file is a video
      if (!selectedFile.type.startsWith("video/")) {
        setUploadError("Please select a valid video file.")
        return
      }

      // Check file size (100MB limit for example)
      if (selectedFile.size > 100 * 1024 * 1024) {
        setUploadError("File size exceeds 100MB limit.")
        return
      }

      setFile(selectedFile)
      setUploadError(null)

      // Auto-fill title from filename if empty
      if (!title) {
        const fileName = selectedFile.name.replace(/\.[^/.]+$/, "") // Remove extension
        setTitle(fileName)
      }
    }
  }

  const handleUpload = async () => {
    if (!file || !user) return

    if (!title.trim()) {
      setUploadError("Please enter a title for your video.")
      return
    }

    setUploading(true)
    setUploadProgress(0)
    setUploadError(null)

    try {
      // Step 1: Create a new video on Vimeo and get upload URL
      const formData = new FormData()
      formData.append("name", title)
      formData.append("description", description)
      formData.append("privacy", "anybody") // Default privacy setting
      formData.append("userId", user.uid)
      formData.append("size", file.size.toString())

      // Add selected niches as tags
      selectedNiches.forEach((niche) => {
        formData.append("tag", niche)
      })

      const initResponse = await fetch("/api/vimeo/upload", {
        method: "POST",
        body: formData,
      })

      if (!initResponse.ok) {
        const errorData = await initResponse.json()
        throw new Error(errorData.details || "Failed to initialize upload")
      }

      const { uploadUrl, vimeoId, link } = await initResponse.json()

      if (!uploadUrl || !vimeoId) {
        throw new Error("Invalid response from server")
      }

      // Step 2: Upload the file to Vimeo
      const xhr = new XMLHttpRequest()

      xhr.open("PATCH", uploadUrl, true)
      xhr.setRequestHeader("Tus-Resumable", "1.0.0")
      xhr.setRequestHeader("Upload-Offset", "0")
      xhr.setRequestHeader("Content-Type", "application/offset+octet-stream")

      // Track upload progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          setUploadProgress(progress)
        }
      }

      // Handle upload completion
      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            // Step 3: Save upload info to Firestore
            const uploadDoc = {
              title,
              description,
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
              status: "processing", // Initial status
              createdAt: serverTimestamp(),
              vimeoId,
              vimeoLink: link,
              userId: user.uid,
              tags: selectedNiches, // Save selected niches as tags
              visibility: "public", // Default visibility
            }

            const uploadId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
            await setDoc(doc(db, `users/${user.uid}/uploads`, uploadId), uploadDoc)

            setUploadSuccess(true)
            setUploading(false)

            // Redirect to uploads page after 2 seconds
            setTimeout(() => {
              router.push("/dashboard/uploads")
            }, 2000)
          } catch (error) {
            console.error("Error saving to Firestore:", error)
            setUploadError("Upload completed, but failed to save details.")
            setUploading(false)
          }
        } else {
          console.error("Upload failed:", xhr.statusText)
          setUploadError(`Upload failed: ${xhr.statusText}`)
          setUploading(false)
        }
      }

      // Handle upload errors
      xhr.onerror = () => {
        console.error("Network error during upload")
        setUploadError("Network error during upload. Please try again.")
        setUploading(false)
      }

      // Send the file
      xhr.send(file)
    } catch (error) {
      console.error("Upload error:", error)
      setUploadError(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`)
      setUploading(false)
    }
  }

  const resetForm = () => {
    setFile(null)
    setTitle("")
    setDescription("")
    setSelectedNiches([])
    setUploadError(null)
    setUploadSuccess(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Authentication Required</h1>
          <p className="text-zinc-400 mb-6">Please log in to upload content</p>
          <Button onClick={() => router.push("/login")}>Log In</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-zinc-800/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Dashboard</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-24 pb-16 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Upload Content</h1>
          <p className="text-zinc-400">Share your videos with the MassClip community</p>
        </div>

        <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-6 mb-8">
          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-300 mb-2">Video File</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-zinc-700 rounded-lg">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-zinc-500" />
                <div className="flex text-sm text-zinc-400">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer rounded-md font-medium text-crimson hover:text-crimson-light focus-within:outline-none"
                  >
                    <span>Upload a file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      accept="video/*"
                      onChange={handleFileChange}
                      ref={fileInputRef}
                      disabled={uploading}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-zinc-500">MP4, MOV, or WebM up to 100MB</p>
              </div>
            </div>
            {file && (
              <div className="mt-2 flex items-center justify-between bg-zinc-800/50 p-2 rounded">
                <span className="text-sm text-zinc-300 truncate max-w-[80%]">{file.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFile(null)}
                  disabled={uploading}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Title */}
          <div className="mb-6">
            <label htmlFor="title" className="block text-sm font-medium text-zinc-300 mb-2">
              Title
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for your video"
              className="bg-zinc-900/50 border-zinc-800 text-white"
              disabled={uploading}
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-zinc-300 mb-2">
              Description (optional)
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              className="bg-zinc-900/50 border-zinc-800 text-white min-h-[100px]"
              disabled={uploading}
            />
          </div>

          {/* Niche Categories Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-300 mb-2">Categories</label>
            <NicheSelector selectedNiches={selectedNiches} onChange={setSelectedNiches} />
            <p className="mt-2 text-xs text-zinc-500">Select one or more categories that best describe your content</p>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-zinc-300">Uploading...</span>
                <span className="text-sm text-zinc-400">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Error Message */}
          {uploadError && (
            <div className="mb-6 p-3 bg-red-900/20 border border-red-900/50 rounded-md flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-500">Upload Failed</p>
                <p className="text-xs text-zinc-400 mt-1">{uploadError}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {uploadSuccess && (
            <div className="mb-6 p-3 bg-green-900/20 border border-green-900/50 rounded-md flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-500">Upload Successful</p>
                <p className="text-xs text-zinc-400 mt-1">
                  Your video has been uploaded and is now being processed. You will be redirected shortly.
                </p>
              </div>
            </div>
          )}

          {/* Info Message */}
          <div className="mb-6 p-3 bg-blue-900/20 border border-blue-900/50 rounded-md flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-500">Processing Time</p>
              <p className="text-xs text-zinc-400 mt-1">
                After upload, your video will be processed which may take a few minutes depending on the file size. You
                can check the status in your uploads section.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              onClick={handleUpload}
              disabled={!file || uploading || uploadSuccess}
              className="bg-gradient-to-r from-crimson to-crimson-dark text-white hover:from-crimson-dark hover:to-crimson flex-1"
            >
              {uploading ? "Uploading..." : "Upload Video"}
            </Button>
            <Button
              variant="outline"
              onClick={resetForm}
              disabled={uploading}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Reset
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
