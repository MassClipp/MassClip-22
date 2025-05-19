import PresignedUploadForm from "@/components/presigned-upload-form"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Upload Video - MassClip",
  description: "Upload your video content to MassClip",
}

export default function UploadPage() {
  return <PresignedUploadForm />
}
