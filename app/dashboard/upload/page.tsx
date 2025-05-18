import type { Metadata } from "next"
import VideoUploadForm from "@/components/video-upload-form"

export const metadata: Metadata = {
  title: "Upload Video - MassClip",
  description: "Upload your videos to share with your audience",
}

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-black py-12">
      <VideoUploadForm />
    </div>
  )
}
