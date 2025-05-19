"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"

interface VideoDebugProps {
  videoUrl: string
}

export default function VideoDebug({ videoUrl }: VideoDebugProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [networkStatus, setNetworkStatus] = useState<string>("Not tested")
  const [directPlayStatus, setDirectPlayStatus] = useState<string>("Not tested")
  const videoRef = useRef<HTMLVideoElement>(null)

  const testNetworkRequest = async () => {
    setNetworkStatus("Testing...")
    try {
      const response = await fetch(videoUrl, { method: "HEAD" })
      if (response.ok) {
        setNetworkStatus(`Success (${response.status}): Content-Type: ${response.headers.get("content-type")}`)
      } else {
        setNetworkStatus(`Failed (${response.status}): ${response.statusText}`)
      }
    } catch (error) {
      setNetworkStatus(`Error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const testDirectPlay = () => {
    setDirectPlayStatus("Testing...")
    if (videoRef.current) {
      try {
        videoRef.current.onloadeddata = () => {
          setDirectPlayStatus("Video loaded successfully")
        }
        videoRef.current.onerror = (e) => {
          setDirectPlayStatus(`Error: ${(e.target as HTMLVideoElement).error?.message || "Unknown error"}`)
        }
        // Force reload the video
        videoRef.current.load()
      } catch (error) {
        setDirectPlayStatus(`Error: ${error instanceof Error ? error.message : String(error)}`)
      }
    } else {
      setDirectPlayStatus("Video element not found")
    }
  }

  return (
    <div className="mt-8 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-white">Video Debug Tools</h3>
        <Button variant="outline" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? "Hide" : "Show"}
        </Button>
      </div>

      {isExpanded && (
        <div className="space-y-4">
          <div>
            <p className="text-zinc-400 mb-2">Video URL:</p>
            <div className="bg-zinc-800 p-2 rounded overflow-x-auto">
              <code className="text-xs text-zinc-300 whitespace-pre-wrap break-all">{videoUrl}</code>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-zinc-400 mb-2">Network Request Test:</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={testNetworkRequest}>
                  Test Network
                </Button>
                <span className="text-sm text-zinc-300">{networkStatus}</span>
              </div>
            </div>

            <div>
              <p className="text-zinc-400 mb-2">Direct Play Test:</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={testDirectPlay}>
                  Test Direct Play
                </Button>
                <span className="text-sm text-zinc-300">{directPlayStatus}</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-zinc-400 mb-2">Hardcoded Player Test:</p>
            <div
              className="mx-auto overflow-hidden bg-black rounded-lg"
              style={{
                aspectRatio: "9/16",
                maxWidth: "calc(100vh * 9/16 * 0.5)", // Half the size of the main player
                width: "100%",
              }}
            >
              <video
                ref={videoRef}
                className="w-full h-full object-contain bg-black"
                controls
                playsInline
                preload="metadata"
              >
                <source src={videoUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
