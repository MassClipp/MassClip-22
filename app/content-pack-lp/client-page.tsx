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
  const videoRef = useRef<HTMLVideoElement>(null)

  const togglePlay = () => {
    if (!videoRef.current) return

    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
    } else {
      // Pause all other videos
      document.querySelectorAll("video").forEach((video) => {
        if (video !== videoRef.current) {
          video.pause()
        }
      })
      videoRef.current.play()
      setIsPlaying(true)
    }
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => setIsPlaying(false)

    video.addEventListener("play", handlePlay)
    video.addEventListener("pause", handlePause)
    video.addEventListener("ended", handleEnded)

    return () => {
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("pause", handlePause)
      video.removeEventListener("ended", handleEnded)
    }
  }, [])

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
        muted
        loop
      />

      {/* <CHANGE> Custom play/pause button overlay */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
          isPlaying && !isHovered ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="w-16 h-16 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-200">
          {isPlaying ? (
            <Pause className="w-7 h-7 text-black fill-black" />
          ) : (
            <Play className="w-7 h-7 text-black fill-black ml-1" />
          )}
        </div>
      </div>

      {/* Dark overlay when not playing */}
      {!isPlaying && (
        <div className="absolute inset-0 bg-black/20 transition-opacity duration-200 group-hover:bg-black/10" />
      )}
    </div>
  )
}

export default function ClientContentPackPage() {
  return (
    <div className="min-h-screen bg-black">
      <div className="w-full">
        <LandingContentPack />

        {/* <CHANGE> Custom video preview section with play button controls */}
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
