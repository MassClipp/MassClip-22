import type { Metadata } from "next"
import PremiumUploadForm from "@/components/premium-upload-form"

export const metadata: Metadata = {
  title: "Upload Premium Content | MassClip",
  description: "Upload your premium content to MassClip",
}

export default function PremiumUploadPage() {
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8 text-center text-white">Upload Premium Content</h1>
      <PremiumUploadForm />
    </div>
  )
}
