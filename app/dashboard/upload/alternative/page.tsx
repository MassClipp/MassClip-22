"use client"

import type React from "react"

import { useState, useCallback, useRef } from "react"
import Link from "next/link"
import { ArrowLeft, Upload, FileVideo, AlertCircle, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp, updateDoc, doc } from "firebase/firestore"
import { directUploadToVimeo } from "@/lib/direct-vimeo-upload"

export default function AlternativeUploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStage, setUploadStage] = useState<
    "idle" | "preparing" | "uploading" | "processing" | "complete" | "error"
  >("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()

  // Handle file input change
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0]
        if (file.type.startsWith("video/")) {
          setSelectedFile(file)
          toast({
            title: "File selected",
            description: `${file.name} has been selected for upload.`,
          })
        } else {
          toast({
            title: "Invalid file type",
            description: "Please upload a video file.",
            variant: "destructive",
          })
        }
      }
    },
    [toast],
  )

  // Handle browse files click
  const handleBrowseClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [])

  // Upload function
  const handleUpload = useCallback(async () => {
    if (!selectedFile || !user) return

    setIsUploading(true)
    setUploadProgress(0)
    setUploadStage("preparing")
    setErrorMessage(null)

    try {
      // Step 1: Create a document in Firestore to track the upload
      const uploadData = {
        title: selectedFile.name,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        createdAt: serverTimestamp(),
        userId: user.uid,
        status: "preparing",
        vimeoId: null,
        vimeoLink: null,
      }

      const docRef = await addDoc(collection(db, "uploads"), uploadData)
      const uploadId = docRef.id

      // Step 2: Initialize the Vimeo upload using the direct upload approach
      const formData = new FormData()
      formData.append("name", selectedFile.name)
      formData.append("size", selectedFile.size.toString())
      formData.append("privacy", "anybody")
      formData.append("userId", user.uid)

      const initResponse = await fetch("/api/vimeo/direct-upload", {
        method: "POST",
        body: formData,
      })

      if (!initResponse.ok) {
        const errorData = await initResponse.json()
        throw new Error(errorData.details || "Failed to initialize upload")
      }

      const vimeoData = await initResponse.json()

      // Update Firestore with Vimeo ID
      await updateDoc(doc(db, "uploads", uploadId), {
        vimeoId: vimeoData.vimeoId,
        vimeoLink: vimeoData.link,
        status: "uploading",
      })

      // Step 3: Upload the file
      setUploadStage("uploading")

      await directUploadToVimeo({
        file: selectedFile,
        uploadUrl: vimeoData.uploadUrl,
        onProgress: (progress) => {
          setUploadProgress(progress)
        },
        onError: (error) => {
          throw error
        },
      })

      // Update status in Firestore
      await updateDoc(doc(db, "uploads", uploadId), {
        status: "processing",
        uploadedAt: serverTimestamp(),
      })

      setUploadStage("processing")
      setUploadProgress(100)

      toast({
        title: "Upload complete",
        description: "Your video has been uploaded and is now processing.",
      })

      // Redirect to uploads page
      router.push("/dashboard/uploads")
    } catch (error) {
      console.error("Upload error:", error)
      setUploadStage("error")
      setErrorMessage(error instanceof Error ? error.message : "Failed to upload video")

      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "There was an error uploading your video",
        variant: "destructive",
      })

      setIsUploading(false)
    }
  }, [selectedFile, user, toast, router])

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-zinc-800/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Dashboard</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-24 pb-16 max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Alternative Upload Method</h1>
          <p className="text-zinc-400">This page uses a simplified direct upload approach</p>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 mb-8">
          {isUploading ? (
            <div className="flex flex-col items-center justify-center text-center">
              {uploadStage === "error" ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                    <AlertCircle className="w-6 h-6 text-red-500" />
                  </div>
                  <p className="text-lg font-medium mb-2 text-red-500">Upload Failed</p>
                  <p className="text-sm text-zinc-400 mb-4">{errorMessage}</p>
                  <Button onClick={() => setIsUploading(false)} variant="outline">
                    Try Again
                  </Button>
                </>
              ) : (
                <>
                  <Progress value={uploadProgress} className="w-full h-2 mb-4" />
                  <p className="text-sm font-medium mb-1">
                    {uploadStage === "preparing"
                      ? "Preparing upload..."
                      : uploadStage === "uploading"
                        ? `Uploading video (${uploadProgress.toFixed(0)}%)`
                        : "Processing video..."}
                  </p>
                  {uploadStage === "uploading" && uploadProgress === 0 && (
                    <div className="flex items-center justify-center mt-2">
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      <span className="text-xs text-zinc-400">Starting upload...</span>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-b from-zinc-800 to-zinc-900 flex items-center justify-center mb-6">
                <Upload className="w-8 h-8 text-zinc-400" />
              </div>

              {selectedFile ? (
                <div className="mb-6">
                  <div className="flex items-center justify-center mb-4">
                    <FileVideo className="w-6 h-6 text-zinc-400 mr-2" />
                    <span className="font-medium">{selectedFile.name}</span>
                  </div>
                  <p className="text-sm text-zinc-400">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Ready to upload
                  </p>
                </div>
              ) : (
                <>
                  <h3 className="text-xl font-medium mb-2">Select a video file</h3>
                  <p className="text-zinc-400 text-sm mb-6">Upload MP4, MOV or WebM files</p>
                </>
              )}

              <input type="file" accept="video/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />

              {selectedFile ? (
                <Button
                  onClick={handleUpload}
                  className="bg-gradient-to-r from-crimson to-crimson-dark text-white hover:from-crimson-dark hover:to-crimson"
                >
                  Upload Now
                </Button>
              ) : (
                <Button onClick={handleBrowseClick} variant="outline">
                  Select File
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-sm text-zinc-500 mb-2">Having trouble with the regular upload page?</p>
          <p className="text-sm text-zinc-400">
            This alternative method uses a different upload approach that may work better in some cases.
          </p>
        </div>
      </main>
    </div>
  )
}
