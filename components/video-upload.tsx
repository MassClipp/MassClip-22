"use client"

import { useState } from "react"
import { VideoUploadDropzone } from "./video-upload-dropzone"
import { VideoMetadataForm } from "./video-metadata-form"
import { useVideoUpload } from "@/hooks/use-video-upload"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export function VideoUpload() {
  const [step, setStep] = useState<"upload" | "metadata">("upload")
  const { isUploading, progress, error, uploadedFile, uploadVideo, resetUpload } = useVideoUpload()

  const handleFileSelected = async (file: File) => {
    const result = await uploadVideo(file)
    if (result) {
      setStep("metadata")
    }
  }

  const handleMetadataComplete = () => {
    resetUpload()
    setStep("upload")
  }

  const handleCancel = () => {
    resetUpload()
    setStep("upload")
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Upload Video</h1>

      {step === "upload" && (
        <VideoUploadDropzone
          onFileSelected={handleFileSelected}
          isUploading={isUploading}
          progress={progress}
          error={error}
        />
      )}

      {step === "metadata" && uploadedFile && (
        <div className="space-y-6">
          <div className="flex items-center">
            <Button variant="ghost" size="sm" onClick={handleCancel} className="mr-2">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <h2 className="text-xl font-semibold">Video Details</h2>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <p className="text-sm text-gray-500 mb-1">Uploaded File</p>
            <p className="font-medium truncate">{uploadedFile.name}</p>
          </div>

          <VideoMetadataForm
            videoUrl={uploadedFile.url}
            videoName={uploadedFile.name}
            onComplete={handleMetadataComplete}
            onCancel={handleCancel}
          />
        </div>
      )}
    </div>
  )
}
