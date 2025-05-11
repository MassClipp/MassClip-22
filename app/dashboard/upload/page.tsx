"use client"

import { VideoUpload } from "@/components/video-upload"
import { Toaster } from "@/components/ui/toaster"

export default function UploadPage() {
  return (
    <div className="container mx-auto py-8">
      <VideoUpload />
      <Toaster />
    </div>
  )
}
