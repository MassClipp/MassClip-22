"use client"

import { useState } from "react"
import SimpleVideoPlayer from "@/components/simple-video-player"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function VideoPlayerTestPage() {
  const [videoUrl, setVideoUrl] = useState("")
  const [thumbnailUrl, setThumbnailUrl] = useState("")
  const [testResults, setTestResults] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const testVideoUrl = async (url: string) => {
    if (!url) return

    setIsLoading(true)

    try {
      const response = await fetch(url, { method: "HEAD" })

      const headers: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        headers[key] = value
      })

      setTestResults({
        url,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers,
        testedAt: new Date().toISOString(),
      })
    } catch (error) {
      setTestResults({
        url,
        error: error instanceof Error ? error.message : String(error),
        testedAt: new Date().toISOString(),
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Sample videos for testing
  const sampleVideos = [
    {
      name: "Sample R2 Video",
      url: "https://pub-e23c9e9b9b4f46a79dc429f4aa4c08b3.r2.dev/videos/sample-video.mp4",
      thumbnail: "https://pub-e23c9e9b9b4f46a79dc429f4aa4c08b3.r2.dev/thumbnails/sample-thumbnail.jpg",
    },
    {
      name: "Sample MP4 Video",
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      thumbnail: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg",
    },
  ]

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Video Player Test</h1>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Your Video URL</h2>

          <div className="flex gap-4 mb-4">
            <Input
              type="text"
              placeholder="Enter video URL"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="flex-1 bg-zinc-900 border-zinc-700 text-white"
            />
            <Button onClick={() => testVideoUrl(videoUrl)} disabled={!videoUrl || isLoading}>
              {isLoading ? "Testing..." : "Test URL"}
            </Button>
          </div>

          <div className="flex gap-4 mb-6">
            <Input
              type="text"
              placeholder="Enter thumbnail URL (optional)"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              className="flex-1 bg-zinc-900 border-zinc-700 text-white"
            />
          </div>

          {videoUrl && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <h3 className="text-lg font-medium mb-2">Video Player</h3>
                <SimpleVideoPlayer videoUrl={videoUrl} thumbnailUrl={thumbnailUrl} title="Test Video" />
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Native Video Element</h3>
                <div className="relative bg-black rounded-lg" style={{ paddingBottom: "177.78%" }}>
                  <video
                    className="absolute inset-0 w-full h-full object-contain"
                    controls
                    preload="metadata"
                    poster={thumbnailUrl || undefined}
                  >
                    <source src={videoUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
            </div>
          )}

          {testResults && (
            <div className="bg-zinc-900 p-4 rounded-lg mb-8">
              <h3 className="text-lg font-medium mb-2">Test Results</h3>
              <pre className="text-xs overflow-auto p-2 bg-zinc-800 rounded">
                {JSON.stringify(testResults, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Sample Videos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sampleVideos.map((video, index) => (
              <div key={index} className="bg-zinc-900 rounded-lg overflow-hidden">
                <SimpleVideoPlayer videoUrl={video.url} thumbnailUrl={video.thumbnail} title={video.name} />
                <div className="p-3">
                  <h3 className="font-medium mb-1">{video.name}</h3>
                  <p className="text-xs text-zinc-400 truncate">{video.url}</p>
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setVideoUrl(video.url)
                        setThumbnailUrl(video.thumbnail)
                      }}
                    >
                      Use This Video
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => testVideoUrl(video.url)}>
                      Test URL
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
