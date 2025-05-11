"use client"

import { useState, useEffect } from "react"
import { getBrowserVideoSupport, isSafari } from "@/lib/video-utils"

interface VideoFormatTestProps {
  videoUrl: string
}

export default function VideoFormatTest({ videoUrl }: VideoFormatTestProps) {
  const [formatSupport, setFormatSupport] = useState<any>(null)
  const [isSafariBrowser, setIsSafariBrowser] = useState<boolean>(false)
  const [testResults, setTestResults] = useState<{ [key: string]: boolean }>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const support = getBrowserVideoSupport()
      setFormatSupport(support)
      setIsSafariBrowser(isSafari())
      setLoading(false)
    } catch (err) {
      console.error("Error getting browser support:", err)
      setError("Failed to check browser support")
      setLoading(false)
    }
  }, [])

  // Test the video URL with different formats
  useEffect(() => {
    async function testFormats() {
      const results: { [key: string]: boolean } = {}

      // Test MP4
      try {
        const mp4Response = await fetch(videoUrl, { method: "HEAD" })
        results.mp4 = mp4Response.ok
      } catch (err) {
        results.mp4 = false
      }

      // Test WebM
      try {
        const webmUrl = videoUrl.replace(".mp4", ".webm")
        const webmResponse = await fetch(webmUrl, { method: "HEAD" })
        results.webm = webmResponse.ok
      } catch (err) {
        results.webm = false
      }

      setTestResults(results)
    }

    if (videoUrl) {
      testFormats()
    }
  }, [videoUrl])

  if (loading) {
    return <div className="p-4 bg-zinc-900 rounded-lg">Loading format information...</div>
  }

  if (error) {
    return <div className="p-4 bg-zinc-900 rounded-lg text-red-400">{error}</div>
  }

  return (
    <div className="p-4 bg-zinc-900/50 rounded-lg text-sm">
      <h3 className="font-medium text-white mb-2">Video Format Compatibility</h3>

      <div className="mb-4">
        <p className="text-zinc-400">Browser: {navigator.userAgent}</p>
        <p className="text-zinc-400">Safari detected: {isSafariBrowser ? "Yes" : "No"}</p>
      </div>

      <div className="mb-4">
        <h4 className="font-medium text-white mb-1">Format Support:</h4>
        <ul className="space-y-1 text-xs">
          <li>
            MP4 (H.264):{" "}
            <span className={formatSupport?.mp4?.h264 ? "text-green-400" : "text-red-400"}>
              {formatSupport?.mp4?.h264 || "Not supported"}
            </span>
          </li>
          <li>
            MP4 (H.265):{" "}
            <span className={formatSupport?.mp4?.h265 ? "text-green-400" : "text-red-400"}>
              {formatSupport?.mp4?.h265 || "Not supported"}
            </span>
          </li>
          <li>
            WebM (VP8):{" "}
            <span className={formatSupport?.webm?.vp8 ? "text-green-400" : "text-red-400"}>
              {formatSupport?.webm?.vp8 || "Not supported"}
            </span>
          </li>
          <li>
            WebM (VP9):{" "}
            <span className={formatSupport?.webm?.vp9 ? "text-green-400" : "text-red-400"}>
              {formatSupport?.webm?.vp9 || "Not supported"}
            </span>
          </li>
          <li>
            OGG:{" "}
            <span className={formatSupport?.ogg ? "text-green-400" : "text-red-400"}>
              {formatSupport?.ogg || "Not supported"}
            </span>
          </li>
          <li>
            HLS:{" "}
            <span className={formatSupport?.hls ? "text-green-400" : "text-red-400"}>
              {formatSupport?.hls || "Not supported"}
            </span>
          </li>
        </ul>
      </div>

      <div className="mb-4">
        <h4 className="font-medium text-white mb-1">File Availability:</h4>
        <ul className="space-y-1 text-xs">
          <li>
            MP4:{" "}
            <span className={testResults.mp4 ? "text-green-400" : "text-red-400"}>
              {testResults.mp4 ? "Available" : "Not available"}
            </span>
          </li>
          <li>
            WebM:{" "}
            <span className={testResults.webm ? "text-green-400" : "text-red-400"}>
              {testResults.webm ? "Available" : "Not available"}
            </span>
          </li>
        </ul>
      </div>

      <div>
        <h4 className="font-medium text-white mb-1">Recommendation:</h4>
        {isSafariBrowser ? (
          <p className="text-yellow-400">
            Safari has limited video format support. MP4 with H.264 codec is recommended.
          </p>
        ) : (
          <p className="text-green-400">
            Your browser supports multiple video formats. WebM is recommended for best quality/size ratio.
          </p>
        )}
      </div>
    </div>
  )
}
