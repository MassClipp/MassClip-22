"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import DirectVideoPlayer from "@/components/direct-video-player"

interface VideoDebugProps {
  videoUrl: string
  thumbnailUrl?: string
}

export default function VideoDebug({ videoUrl, thumbnailUrl }: VideoDebugProps) {
  const [urlTestResult, setUrlTestResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const testVideoUrl = async () => {
    if (!videoUrl) return

    setIsLoading(true)

    try {
      console.log("Testing URL:", videoUrl)
      const response = await fetch(videoUrl, { method: "HEAD" })

      const headers: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        headers[key] = value
      })

      setUrlTestResult({
        url: videoUrl,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers,
        testedAt: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Error testing URL:", error)
      setUrlTestResult({
        url: videoUrl,
        error: error instanceof Error ? error.message : String(error),
        testedAt: new Date().toISOString(),
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Test URL on mount
  useEffect(() => {
    if (videoUrl) {
      testVideoUrl()
    }
  }, [videoUrl])

  return (
    <div className="mt-8 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
      <h3 className="text-lg font-medium text-white mb-4">Video Debug Tools</h3>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="text-zinc-300">Direct Video Test</h4>
          <Button variant="outline" size="sm" onClick={() => setShowAdvanced(!showAdvanced)}>
            {showAdvanced ? "Hide Advanced" : "Show Advanced"}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* DirectVideoPlayer - Our guaranteed-to-work player */}
          <div>
            <p className="text-sm text-zinc-400 mb-2">Direct Player</p>
            <DirectVideoPlayer videoUrl={videoUrl} thumbnailUrl={thumbnailUrl} title="Debug Video" />
          </div>

          {/* Native Video Element */}
          <div>
            <p className="text-sm text-zinc-400 mb-2">Native HTML5 Video</p>
            <div className="relative bg-black rounded-lg" style={{ aspectRatio: "9/16" }}>
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

        {showAdvanced && (
          <>
            <div className="mt-4">
              <h4 className="text-zinc-300 mb-2">Video URL</h4>
              <div className="bg-zinc-950 p-2 rounded overflow-x-auto">
                <code className="text-xs text-zinc-400 break-all">{videoUrl}</code>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="text-zinc-300 mb-2">URL Test Results</h4>
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin h-4 w-4 border-2 border-zinc-500 border-t-white rounded-full"></div>
                  <span className="text-zinc-400 text-sm">Testing URL...</span>
                </div>
              ) : urlTestResult ? (
                <div className="bg-zinc-950 p-2 rounded">
                  <pre className="text-xs text-zinc-400 overflow-auto">{JSON.stringify(urlTestResult, null, 2)}</pre>
                </div>
              ) : (
                <p className="text-zinc-500 text-sm">No test results available</p>
              )}
            </div>

            <div className="mt-4">
              <h4 className="text-zinc-300 mb-2">HTML5 Video Element Code</h4>
              <div className="bg-zinc-950 p-2 rounded overflow-x-auto">
                <pre className="text-xs text-zinc-400">
                  {`<video 
  controls 
  width="100%" 
  height="auto" 
  preload="metadata"
  style={{ borderRadius: "8px" }}
>
  <source src="${videoUrl}" type="video/mp4" />
  Your browser does not support the video tag.
</video>`}
                </pre>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button onClick={testVideoUrl} disabled={isLoading} size="sm">
                {isLoading ? "Testing..." : "Retest URL"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
