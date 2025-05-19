import VideoUploadForm from "@/components/video-upload-form"
import type { Metadata } from "next"
import UploadDebug from "@/components/upload-debug"

export const metadata: Metadata = {
  title: "Upload Video - MassClip",
  description: "Upload your video content to MassClip",
}

export default function UploadPage() {
  return (
    <>
      <VideoUploadForm />
      {process.env.NEXT_PUBLIC_VERCEL_ENV === "development" && <UploadDebug />}
    </>
  )
}
