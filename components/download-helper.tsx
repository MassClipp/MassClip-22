"use client"

import { useEffect, useRef } from "react"

interface DownloadHelperProps {
  downloadUrl: string | null
  fileName: string
  onComplete: () => void
  onError: () => void
}

export function DownloadHelper({ downloadUrl, fileName, onComplete, onError }: DownloadHelperProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  useEffect(() => {
    if (!downloadUrl) {
      onError()
      return
    }

    try {
      // Create a hidden iframe for the download
      const iframe = document.createElement("iframe")
      iframe.style.display = "none"
      document.body.appendChild(iframe)
      iframeRef.current = iframe

      // Set the source to the download link
      iframe.src = downloadUrl

      // Set a timeout to consider the download started
      const timeout = setTimeout(() => {
        onComplete()
      }, 1000)

      return () => {
        clearTimeout(timeout)
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe)
        }
      }
    } catch (error) {
      console.error("Download helper error:", error)
      onError()
    }
  }, [downloadUrl, onComplete, onError])

  return null
}
