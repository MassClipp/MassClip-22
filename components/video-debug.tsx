"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

interface VideoDebugProps {
  videoUrl: string
}

export default function VideoDebug({ videoUrl }: VideoDebugProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const testDirectAccess = async () => {
    setIsLoading(true)
    setTestResult(null)

    try {
      const response = await fetch(videoUrl, { method: "HEAD" })

      if (response.ok) {
        setTestResult(`✅ Success! Status: ${response.status}. Content-Type: ${response.headers.get("content-type")}`)
      } else {
        setTestResult(`❌ Failed with status: ${response.status}`)
      }
    } catch (error) {
      setTestResult(`❌ Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mt-4 border border-zinc-800 rounded-lg overflow-hidden">
      <div
        className="bg-zinc-900 p-3 cursor-pointer flex justify-between items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-white font-medium">Video Debug Tools</h3>
        <span className="text-zinc-400">{isOpen ? "▲" : "▼"}</span>
      </div>

      {isOpen && (
        <div className="p-4 bg-zinc-900/50">
          <div className="mb-4">
            <p className="text-zinc-400 text-sm mb-2">Video URL:</p>
            <div className="bg-zinc-800 p-2 rounded overflow-x-auto">
              <code className="text-xs text-zinc-300">{videoUrl}</code>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              size="sm"
              variant="outline"
              className="bg-zinc-800 text-white hover:bg-zinc-700"
              onClick={testDirectAccess}
              disabled={isLoading}
            >
              {isLoading ? "Testing..." : "Test Direct Access"}
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="bg-zinc-800 text-white hover:bg-zinc-700"
              onClick={() => window.open(videoUrl, "_blank")}
            >
              Open in New Tab
            </Button>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded text-sm ${testResult.includes("✅") ? "bg-green-900/20 text-green-400" : "bg-red-900/20 text-red-400"}`}
            >
              {testResult}
            </div>
          )}

          <div className="mt-4">
            <h4 className="text-white text-sm mb-2">Test with hardcoded player:</h4>
            <div className="aspect-video bg-black rounded overflow-hidden">
              <video controls className="w-full h-full" preload="metadata">
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
