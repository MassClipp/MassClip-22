"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import DirectVideoPlayer from "@/components/direct-video-player"

export default function VideoTestPage() {
  const [videoUrl, setVideoUrl] = useState("")
  const [testUrl, setTestUrl] = useState("")

  // Sample Cloudflare R2 URL for testing
  const sampleUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL
    ? `${process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL}/sample-video.mp4`
    : ""

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Video Player Test Page</h1>

        <div className="space-y-8">
          {/* URL Input */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Test Your Video URL</h2>
            <div className="flex gap-4">
              <Input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Enter video URL to test"
                className="flex-1 bg-zinc-900 border-zinc-700"
              />
              <Button onClick={() => setTestUrl(videoUrl)} disabled={!videoUrl}>
                Test
              </Button>
            </div>

            {sampleUrl && (
              <div>
                <p className="text-sm text-zinc-400 mb-2">Or try our sample video:</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setVideoUrl(sampleUrl)
                    setTestUrl(sampleUrl)
                  }}
                >
                  Use Sample Video
                </Button>
              </div>
            )}
          </div>

          {/* Video Player */}
          {testUrl && (
            <div className="border border-zinc-800 rounded-lg p-6 bg-zinc-900/50">
              <DirectVideoPlayer videoUrl={testUrl} title="Video Test" />
            </div>
          )}

          {/* HTML5 Video Reference */}
          <div className="border border-zinc-800 rounded-lg p-6 bg-zinc-900/50">
            <h2 className="text-xl font-semibold mb-4">HTML5 Video Reference</h2>
            <div className="bg-zinc-800 p-4 rounded-md mb-4 overflow-x-auto">
              <pre className="text-sm text-zinc-300">
                {`<video 
  controls 
  width="100%" 
  height="auto" 
  preload="metadata"
  style={{ borderRadius: "8px" }}
>
  <source src={videoUrl} type="video/mp4" />
  Your browser does not support the video tag.
</video>`}
              </pre>
            </div>

            <p className="text-sm text-zinc-400 mb-4">
              This is the standard HTML5 video element that should be used to display videos from Cloudflare R2. Make
              sure your video URLs are accessible and the CORS settings are properly configured.
            </p>
          </div>

          {/* Troubleshooting */}
          <div className="border border-zinc-800 rounded-lg p-6 bg-zinc-900/50">
            <h2 className="text-xl font-semibold mb-4">Troubleshooting</h2>
            <ul className="list-disc list-inside space-y-2 text-zinc-300">
              <li>Ensure your Cloudflare R2 bucket has public access enabled</li>
              <li>Check that CORS is properly configured to allow video streaming</li>
              <li>Verify that the video format is compatible (MP4 is recommended)</li>
              <li>Test the direct URL in a new browser tab to ensure it's accessible</li>
              <li>Check browser console for any errors related to video loading</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
