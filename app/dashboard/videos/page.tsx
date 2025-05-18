import VideoManagement from "@/components/video-management"

export const metadata = {
  title: "Manage Videos - MassClip",
  description: "Manage your uploaded videos",
}

export default function VideosPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <VideoManagement />
    </div>
  )
}
