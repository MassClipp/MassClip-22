import type { Metadata } from "next"
import ThumbnailManager from "@/components/thumbnail-manager"

export const metadata: Metadata = {
  title: "Thumbnail Management | Dashboard",
  description: "Manage video thumbnails and regenerate missing ones",
}

export default function ThumbnailsPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Thumbnail Management</h1>
        <p className="text-zinc-400 mt-2">Generate and manage thumbnails for your video content</p>
      </div>

      <ThumbnailManager />
    </div>
  )
}
