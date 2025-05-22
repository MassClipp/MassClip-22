import type { Metadata } from "next"
import UploadForm from "@/components/upload-form"

export const metadata: Metadata = {
  title: "Upload Content | MassClip",
  description: "Upload your content to MassClip",
}

export default function UploadPage() {
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8 text-center text-white">Upload Your Content</h1>
      <UploadForm />
    </div>
  )
}
