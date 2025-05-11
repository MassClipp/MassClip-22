"use client"

import ClipPlayer from "@/components/ClipPlayer"
import EnhancedClipPlayer from "@/components/EnhancedClipPlayer"
import { useState } from "react"

export default function EnhancedTestPage() {
  const [videoUrl, setVideoUrl] = useState("https://pub-0b3ce0bc519f469c81f8ed504a1ee451.r2.dev/2819%20%20Deceived.mp4")

  const testVideos = [
    {
      title: "Deceived",
      url: "https://pub-0b3ce0bc519f469c81f8ed504a1ee451.r2.dev/2819%20%20Deceived.mp4",
    },
    {
      title: "Sample Video",
      url: "https://pub-0b3ce0bc519f469c81f8ed504a1ee451.r2.dev/sample.mp4",
    },
  ]

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Video Player Comparison</h1>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Select a video:</h2>
        <div className="flex flex-wrap gap-4 mb-6">
          {testVideos.map((video, index) => (
            <button
              key={index}
              onClick={() => setVideoUrl(video.url)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              {video.title}
            </button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Basic Player</h2>
          <ClipPlayer src={videoUrl} />
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Enhanced Player</h2>
          <EnhancedClipPlayer src={videoUrl} title="Enhanced Video Player" />
        </div>
      </div>
    </div>
  )
}
