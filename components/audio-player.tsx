"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward } from "lucide-react"
import { cn } from "@/lib/utils"

interface AudioPlayerProps {
  src: string
  title?: string
  className?: string
  showControls?: boolean
}

export default function AudioPlayer({ src, title = "Audio", className, showControls = true }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)

  // Update current time
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setDuration(audio.duration)

    audio.addEventListener("timeupdate", updateTime)
    audio.addEventListener("loadedmetadata", updateDuration)
    audio.addEventListener("ended", () => setIsPlaying(false))

    return () => {
      audio.removeEventListener("timeupdate", updateTime)
      audio.removeEventListener("loadedmetadata", updateDuration)
      audio.removeEventListener("ended", () => setIsPlaying(false))
    }
  }, [])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      // Pause all other audio elements
      document.querySelectorAll("audio").forEach((a) => {
        if (a !== audio) a.pause()
      })
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current
    if (!audio) return

    audio.currentTime = value[0]
    setCurrentTime(value[0])
  }

  const handleVolumeChange = (value: number[]) => {
    const audio = audioRef.current
    if (!audio) return

    const newVolume = value[0]
    audio.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isMuted) {
      audio.volume = volume
      setIsMuted(false)
    } else {
      audio.volume = 0
      setIsMuted(true)
    }
  }

  const skip = (seconds: number) => {
    const audio = audioRef.current
    if (!audio) return

    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + seconds))
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  if (!showControls) {
    return (
      <audio ref={audioRef} controls className={cn("w-full", className)} preload="metadata">
        <source src={src} />
        Your browser does not support the audio element.
      </audio>
    )
  }

  return (
    <div className={cn("bg-zinc-900 rounded-lg p-4 space-y-3", className)}>
      <audio ref={audioRef} preload="metadata">
        <source src={src} />
      </audio>

      {/* Title */}
      <div className="text-sm font-medium text-white truncate">{title}</div>

      {/* Progress bar */}
      <div className="space-y-2">
        <Slider value={[currentTime]} max={duration || 100} step={1} onValueChange={handleSeek} className="w-full" />
        <div className="flex justify-between text-xs text-zinc-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => skip(-10)} className="h-8 w-8 p-0">
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button size="sm" onClick={togglePlay} className="h-10 w-10 rounded-full bg-red-600 hover:bg-red-700">
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </Button>

          <Button size="sm" variant="ghost" onClick={() => skip(10)} className="h-8 w-8 p-0">
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Volume control */}
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={toggleMute} className="h-8 w-8 p-0">
            {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume]}
            max={1}
            step={0.1}
            onValueChange={handleVolumeChange}
            className="w-20"
          />
        </div>
      </div>
    </div>
  )
}
