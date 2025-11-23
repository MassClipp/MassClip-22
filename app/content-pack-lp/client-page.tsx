"use client"

import { LandingContentPack } from "@/components/landing-content-pack"
import { useState, useRef, useEffect } from "react"
import { Play, Pause } from "lucide-react"

const VIDEO_URLS = [
  "https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stack/Motivation/1763847406270-Real_AF_._Analysis_Paralysis.mov",
  "https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stack/1763566379011-Eric_Thomas__Enough_is_Enough.mp4",
  "https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stack/1763488268212-Inky_Johnson-2.mov",
  "https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stacksavvy8/1759800834232-Damii-2.mov",
]

function VideoPreview({ src, index }: { src: string; index: number }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const togglePlay = async () => {
    if (!videoRef.current) return

    try {
      if (isPlaying) {
        videoRef.current.pause()
        setIsPlaying(false)
        console.log("[v0] Video paused:", index)
      } else {
        // Pause all other videos
        const allVideos = document.querySelectorAll("video")
        allVideos.forEach((video) => {
          if (video !== videoRef.current && !video.paused) {
            video.pause()
          }
        })

        // Ensure video is ready to play
        if (videoRef.current.readyState < 2) {
          console.log("[v0] Video not ready, loading:", index)
          await new Promise((resolve) => {
            const handleCanPlay = () => {
              videoRef.current?.removeEventListener("canplay", handleCanPlay)
              resolve(true)
            }
            videoRef.current?.addEventListener("canplay", handleCanPlay)
          })
        }

        console.log("[v0] Attempting to play video:", index)
        const playPromise = videoRef.current.play()

        if (playPromise !== undefined) {
          await playPromise
          setIsPlaying(true)
          console.log("[v0] Video playing successfully:", index)
        }
      }
    } catch (err) {
      console.error("[v0] Video playback error:", err, "video index:", index)
      setError(err instanceof Error ? err.message : "Playback failed")
      setIsPlaying(false)
    }
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handlePlay = () => {
      setIsPlaying(true)
      setError(null)
      console.log("[v0] Video started playing:", index)
    }
    const handlePause = () => {
      setIsPlaying(false)
      console.log("[v0] Video paused:", index)
    }
    const handleEnded = () => {
      setIsPlaying(false)
      console.log("[v0] Video ended:", index)
    }
    const handleError = (e: Event) => {
      const errorMessage = (e.target as HTMLVideoElement)?.error?.message || "Video load error"
      console.error("[v0] Video error:", errorMessage, "video index:", index)
      setError(errorMessage)
      setIsPlaying(false)
    }
    const handleLoadedData = () => {
      console.log("[v0] Video loaded and ready:", index)
    }

    video.addEventListener("play", handlePlay)
    video.addEventListener("pause", handlePause)
    video.addEventListener("ended", handleEnded)
    video.addEventListener("error", handleError)
    video.addEventListener("loadeddata", handleLoadedData)

    return () => {
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("pause", handlePause)
      video.removeEventListener("ended", handleEnded)
      video.removeEventListener("error", handleError)
      video.removeEventListener("loadeddata", handleLoadedData)
    }
  }, [index])

  return (
    <div
      className="aspect-[9/16] relative rounded-xl overflow-hidden bg-zinc-900 border border-white/10 cursor-pointer group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-cover"
        preload="metadata"
        playsInline
        // @ts-ignore - webkit-playsinline for older iOS
        webkit-playsinline="true"
        loop
      />

      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
          isPlaying && !isHovered ? "opacity-0" : "opacity-100"
        }`}
      >
        {isPlaying ? (
          <Pause className="w-8 h-8 text-white drop-shadow-2xl group-hover:scale-110 transition-transform duration-200" />
        ) : (
          <Play className="w-8 h-8 text-white drop-shadow-2xl group-hover:scale-110 transition-transform duration-200 fill-white" />
        )}
      </div>

      {/* Dark overlay when not playing */}
      {!isPlaying && (
        <div className="absolute inset-0 bg-black/20 transition-opacity duration-200 group-hover:bg-black/10" />
      )}

      {error && (
        <div className="absolute bottom-2 left-2 right-2 text-xs text-red-400 bg-black/80 p-2 rounded">
          Error: {error}
        </div>
      )}
    </div>
  )
}

export default function ClientContentPackPage() {
  return (
    <div className="min-h-screen bg-black">
      <div className="w-full">
        <LandingContentPack />

        {/* Custom video preview section with play button controls */}
        <section className="py-16 px-6 border-t border-white/10">
          <div className="max-w-6xl mx-auto">
            <h3 className="text-3xl font-bold mb-10 text-center text-white">Preview</h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {VIDEO_URLS.map((url, index) => (
                <VideoPreview key={index} src={url} index={index} />
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
