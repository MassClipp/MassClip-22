"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Play, Pause, Download, Heart, Volume2, VolumeX, SkipBack, SkipForward } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { trackFirestoreWrite } from "@/lib/firestore-optimizer"
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  increment,
  deleteDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { useUserPlan } from "@/hooks/use-user-plan"
import { useDownloadLimit } from "@/contexts/download-limit-context"
import { cn } from "@/lib/utils"

interface AudioCardProps {
  audio: {
    id: string
    title: string
    fileUrl: string
    thumbnailUrl?: string
    creatorName?: string
    uid?: string
    duration?: number
    size?: number
  }
  className?: string
}

export default function AudioCard({ audio, className }: AudioCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [downloadError, setDownloadError] = useState(false)
  const [hasTrackedView, setHasTrackedView] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [isCheckingFavorite, setIsCheckingFavorite] = useState(true)
  const [isHovered, setIsHovered] = useState(false)

  const audioRef = useRef<HTMLAudioElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()
  const { toast } = useToast()
  const { planData } = useUserPlan()
  const { hasReachedLimit, isProUser, forceRefresh } = useDownloadLimit()

  // Check if audio is in favorites
  useEffect(() => {
    const checkIfFavorite = async () => {
      if (!user || !audio.id) {
        setIsCheckingFavorite(false)
        return
      }

      try {
        const favoritesRef = collection(db, `users/${user.uid}/favorites`)
        const q = query(favoritesRef, where("videoId", "==", audio.id))
        const querySnapshot = await getDocs(q)

        setIsFavorite(!querySnapshot.empty)
      } catch (err) {
        console.error("Error checking favorite status:", err)
      } finally {
        setIsCheckingFavorite(false)
      }
    }

    checkIfFavorite()
  }, [user, audio.id])

  // Audio event listeners
  useEffect(() => {
    const audioElement = audioRef.current
    if (!audioElement) return

    const updateTime = () => setCurrentTime(audioElement.currentTime)
    const updateDuration = () => setDuration(audioElement.duration)
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }
    const handleLoadStart = () => setIsLoading(true)
    const handleCanPlay = () => setIsLoading(false)

    audioElement.addEventListener("timeupdate", updateTime)
    audioElement.addEventListener("loadedmetadata", updateDuration)
    audioElement.addEventListener("ended", handleEnded)
    audioElement.addEventListener("loadstart", handleLoadStart)
    audioElement.addEventListener("canplay", handleCanPlay)

    return () => {
      audioElement.removeEventListener("timeupdate", updateTime)
      audioElement.removeEventListener("loadedmetadata", updateDuration)
      audioElement.removeEventListener("ended", handleEnded)
      audioElement.removeEventListener("loadstart", handleLoadStart)
      audioElement.removeEventListener("canplay", handleCanPlay)
    }
  }, [])

  // Track audio view
  const trackAudioView = async () => {
    if (!user || hasTrackedView || !audio.id) return

    try {
      await addDoc(collection(db, `users/${user.uid}/history`), {
        videoId: audio.id,
        video: audio,
        viewedAt: serverTimestamp(),
      })

      trackFirestoreWrite("AudioCard-trackView", 1)
      setHasTrackedView(true)
    } catch (err) {
      console.error("Error tracking audio view:", err)
    }
  }

  // Toggle play/pause
  const togglePlay = async () => {
    const audioElement = audioRef.current
    if (!audioElement) return

    if (isPlaying) {
      audioElement.pause()
      setIsPlaying(false)
    } else {
      // Pause all other audio/video elements
      document.querySelectorAll("audio, video").forEach((element) => {
        if (element !== audioElement) {
          element.pause()
        }
      })

      try {
        await audioElement.play()
        setIsPlaying(true)
        trackAudioView()
      } catch (error) {
        console.error("Error playing audio:", error)
        toast({
          title: "Playback Error",
          description: "Unable to play this audio file",
          variant: "destructive",
        })
      }
    }
  }

  // Seek to position
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audioElement = audioRef.current
    const progressElement = progressRef.current
    if (!audioElement || !progressElement || !duration) return

    const rect = progressElement.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const newTime = (clickX / rect.width) * duration

    audioElement.currentTime = Math.max(0, Math.min(duration, newTime))
    setCurrentTime(newTime)
  }

  // Skip forward/backward
  const skip = (seconds: number) => {
    const audioElement = audioRef.current
    if (!audioElement) return

    const newTime = Math.max(0, Math.min(duration, currentTime + seconds))
    audioElement.currentTime = newTime
    setCurrentTime(newTime)
  }

  // Toggle volume/mute
  const toggleMute = () => {
    const audioElement = audioRef.current
    if (!audioElement) return

    if (isMuted) {
      audioElement.volume = volume
      setIsMuted(false)
    } else {
      audioElement.volume = 0
      setIsMuted(true)
    }
  }

  // Toggle favorite
  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user || !audio.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save favorites",
        variant: "destructive",
      })
      return
    }

    try {
      if (isFavorite) {
        const favoritesRef = collection(db, `users/${user.uid}/favorites`)
        const q = query(favoritesRef, where("videoId", "==", audio.id))
        const querySnapshot = await getDocs(q)

        querySnapshot.forEach(async (document) => {
          await deleteDoc(doc(db, `users/${user.uid}/favorites`, document.id))
        })

        toast({
          title: "Removed from favorites",
          description: "Audio removed from your favorites",
        })
      } else {
        await addDoc(collection(db, `users/${user.uid}/favorites`), {
          videoId: audio.id,
          video: audio,
          createdAt: serverTimestamp(),
        })

        toast({
          title: "Added to favorites",
          description: "Audio saved to your favorites",
        })
      }

      setIsFavorite(!isFavorite)
    } catch (err) {
      console.error("Error toggling favorite:", err)
      toast({
        title: "Error",
        description: "Failed to update favorites",
        variant: "destructive",
      })
    }
  }

  // Handle download
  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isDownloading) return
    setIsDownloading(true)

    try {
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to download audio",
          variant: "destructive",
        })
        return
      }

      if (!audio.fileUrl) {
        setDownloadError(true)
        toast({
          title: "Download Error",
          description: "No download link available for this audio.",
          variant: "destructive",
        })
        return
      }

      if (!isProUser && hasReachedLimit) {
        toast({
          title: "Download Limit Reached",
          description: "You've reached your monthly download limit. Upgrade to Creator Pro for unlimited downloads.",
          variant: "destructive",
        })
        return
      }

      // Record download for non-pro users
      if (!isProUser) {
        const userDocRef = doc(db, "users", user.uid)
        await updateDoc(userDocRef, {
          downloads: increment(1),
        })
        forceRefresh()
      }

      // Download the file
      const filename = `${audio.title?.replace(/[^\w\s]/gi, "") || "audio"}.mp3`
      const downloadLink = document.createElement("a")
      downloadLink.href = audio.fileUrl
      downloadLink.download = filename
      downloadLink.style.display = "none"
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)

      toast({
        title: "Download Started",
        description: "Your audio is downloading",
      })
    } catch (error) {
      console.error("Download failed:", error)
      setDownloadError(true)
      toast({
        title: "Download Error",
        description: "There was an issue starting your download. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDownloading(false)
    }
  }

  // Format time display
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  // Calculate progress percentage
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      className={cn("flex-shrink-0 w-[280px]", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Hidden audio element */}
      <audio ref={audioRef} preload="metadata">
        <source src={audio.fileUrl} />
        Your browser does not support the audio element.
      </audio>

      {/* Audio Card */}
      <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-sm border border-zinc-800/50 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group">
        {/* Header with waveform visualization placeholder */}
        <div className="relative h-24 bg-gradient-to-r from-purple-900/20 via-blue-900/20 to-purple-900/20 flex items-center justify-center">
          {/* Animated waveform bars */}
          <div className="flex items-center gap-1 h-12">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "bg-gradient-to-t from-purple-500 to-blue-500 rounded-full transition-all duration-300",
                  isPlaying ? "animate-pulse" : "",
                )}
                style={{
                  width: "3px",
                  height: `${Math.random() * 40 + 10}px`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>

          {/* Action buttons overlay */}
          <div
            className={cn(
              "absolute top-2 right-2 flex gap-2 transition-opacity duration-300",
              isHovered ? "opacity-100" : "opacity-0",
            )}
          >
            <button
              onClick={toggleFavorite}
              className="p-1.5 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors"
              disabled={isCheckingFavorite}
            >
              <Heart className={cn("h-3.5 w-3.5", isFavorite ? "text-red-500 fill-current" : "text-white")} />
            </button>
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors"
              disabled={isDownloading || hasReachedLimit}
            >
              <Download className={cn("h-3.5 w-3.5", hasReachedLimit ? "text-zinc-400" : "text-white")} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Title and Creator */}
          <div>
            <h3 className="font-medium text-white text-sm line-clamp-2 leading-tight" title={audio.title}>
              {audio.title || "Untitled Audio"}
            </h3>
            {audio.creatorName && <p className="text-xs text-zinc-400 mt-1 truncate">{audio.creatorName}</p>}
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div
              ref={progressRef}
              className="h-1.5 bg-zinc-700 rounded-full cursor-pointer overflow-hidden"
              onClick={handleSeek}
            >
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-150"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-zinc-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            {/* Playback controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => skip(-10)}
                className="p-1.5 rounded-full hover:bg-zinc-800 transition-colors"
                disabled={!duration}
              >
                <SkipBack className="h-4 w-4 text-zinc-400" />
              </button>

              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 flex items-center justify-center transition-all duration-200 disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-4 w-4 text-white" />
                ) : (
                  <Play className="h-4 w-4 text-white ml-0.5" />
                )}
              </button>

              <button
                onClick={() => skip(10)}
                className="p-1.5 rounded-full hover:bg-zinc-800 transition-colors"
                disabled={!duration}
              >
                <SkipForward className="h-4 w-4 text-zinc-400" />
              </button>
            </div>

            {/* Volume control */}
            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className="p-1.5 rounded-full hover:bg-zinc-800 transition-colors">
                {isMuted ? (
                  <VolumeX className="h-4 w-4 text-zinc-400" />
                ) : (
                  <Volume2 className="h-4 w-4 text-zinc-400" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
