"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import DirectVideoPlayer from "./direct-video-player"

interface VideoDebugProps {
  videoUrl: string
}

export default function VideoDebug({ videoUrl }: VideoDebugProps) {
  const [networkTestResult, setNetworkTestResult] = useState<string | null>(null)
  const [isTestingNetwork, setIsTestingNetwork] = useState(false)
  const [showDirectPlayer, setShowDirectPlayer] = useState(false)

  // Test if the video URL is accessible
  const testVideoUrl = async () => {
    if (!videoUrl) {
      setNetworkTestResult("No video URL provided")
      return
    }

    setIsTestingNetwork(true)
    setNetworkTestResult(null)

    try {
      const response = await fetch(videoUrl, { method: "HEAD" })
      console.log(`Video URL test (${videoUrl}):`, response.status, response.statusText)

      if (response.ok) {
        setNetworkTestResult(`✅ Success: Status ${response.status}`)
      } else {
        setNetworkTestResult(`❌ Failed: Status ${response.status} - ${response.statusText}`)
      }
    } catch (error) {
      console.error("Error testing video URL:", error)
      setNetworkTestResult(`❌ Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsTestingNetwork(false)
    }
  }

  return (
    <div className="mt-8 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
      <h3 className="text-lg font-medium text-white mb-4">Video Debug Tools</h3>

      <div className="space-y-6">
        {/* Network Test */}
        <div>
          <h4 className="text-zinc-300 mb-2 text-sm font-medium">Network Test</h4>
          <div className="flex items-center gap-4">
            <Button onClick={testVideoUrl} variant="outline" size="sm" disabled={isTestingNetwork}>
              {isTestingNetwork ? "Testing..." : "Test Network Access"}
            </Button>

            {networkTestResult && (
              <p className={`text-sm ${networkTestResult.includes("✅") ? "text-green-400" : "text-red-400"}`}>
                {networkTestResult}
              </p>
            )}
          </div>
        </div>

        {/* Direct Player */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-zinc-300 text-sm font-medium">Direct Video Player</h4>
            <Button onClick={() => setShowDirectPlayer(!showDirectPlayer)} variant="ghost" size="sm">
              {showDirectPlayer ? "Hide" : "Show"}
            </Button>
          </div>

          {showDirectPlayer && <DirectVideoPlayer videoUrl={videoUrl} title="Raw Video Test" />}
        </div>

        {/* Hardcoded Player */}
        <div>
          <h4 className="text-zinc-300 mb-2 text-sm font-medium">Hardcoded Player</h4>
          <div
            className="relative bg-black rounded-lg overflow-hidden"
            style={{ aspectRatio: "9/16", maxWidth: "200px" }}
          >
            <video className="w-full h-full object-contain" controls preload="metadata" playsInline>
              <source src={videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>

        {/* Video URL */}
        <div>
          <h4 className="text-zinc-300 mb-2 text-sm font-medium">Video URL</h4>
          <div className="p-2 bg-zinc-800 rounded-md overflow-x-auto">
            <code className="text-xs text-zinc-300 break-all">{videoUrl || "No URL available"}</code>
          </div>

          <div className="mt-2">
            <Button
              onClick={() => {
                if (videoUrl) {
                  window.open(videoUrl, "_blank")
                }
              }}
              variant="outline"
              size="sm"
              disabled={!videoUrl}
            >
              Open URL in New Tab
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
