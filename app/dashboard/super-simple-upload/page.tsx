"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { superSimpleUpload } from "@/lib/super-simple-upload"

export default function SuperSimpleUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError(null)
    }
  }

  // Handle upload
  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first")
      return
    }

    if (!user) {
      setError("You must be logged in to upload")
      return
    }

    try {
      setUploading(true)
      setProgress(0)
      setError(null)

      // Step 1: Get upload URL from Vimeo
      const formData = new FormData()
      formData.append("name", file.name)
      formData.append("size", file.size.toString())

      console.log("Requesting upload URL...")
      const response = await fetch("/api/vimeo/super-simple", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.details || "Failed to initialize upload")
      }

      const { uploadUrl, vimeoId } = await response.json()
      console.log("Received upload URL:", uploadUrl)
      console.log("Vimeo ID:", vimeoId)

      // Step 2: Upload the file directly
      await superSimpleUpload(file, uploadUrl, (p) => setProgress(p))

      // Step 3: Show success message
      toast({
        title: "Upload successful",
        description: "Your video has been uploaded to Vimeo",
      })

      // Redirect to uploads page
      router.push("/dashboard/uploads")
    } catch (err) {
      console.error("Upload error:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <header className="mb-8">
        <Link href="/dashboard" className="flex items-center text-zinc-400 hover:text-white">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </header>

      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6">Super Simple Upload</h1>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
          {!file ? (
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-zinc-600 mb-4" />
              <p className="mb-4">Select a video file to upload</p>
              <input type="file" accept="video/*" onChange={handleFileChange} className="hidden" ref={fileInputRef} />
              <Button onClick={() => fileInputRef.current?.click()}>Select File</Button>
            </div>
          ) : (
            <div>
              <p className="font-medium mb-2">{file.name}</p>
              <p className="text-sm text-zinc-400 mb-4">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>

              {uploading ? (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-center">{progress.toFixed(0)}% Uploaded</p>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button onClick={handleUpload} className="flex-1">
                    Upload
                  </Button>
                  <Button variant="outline" onClick={() => setFile(null)} className="flex-1">
                    Change File
                  </Button>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded text-red-300 text-sm">{error}</div>
          )}
        </div>

        <div className="text-sm text-zinc-500">
          <p>This is a super simplified upload page with minimal features.</p>
          <p>It directly uploads the file to Vimeo with no extra processing.</p>
        </div>
      </div>
    </div>
  )
}
