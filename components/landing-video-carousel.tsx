"use client"

import { useEffect, useRef, useState } from "react"

interface LandingVideoCarouselProps {
  videos?: string[]
}

export function LandingVideoCarousel({ videos }: LandingVideoCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollPositionRef = useRef(0)
  const animationFrameRef = useRef<number>()
  const [isInView, setIsInView] = useState(false)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])

  useEffect(() => {
    const forceAllVideosMute = () => {
      videoRefs.current.forEach((video) => {
        if (video) {
          video.muted = true
          video.volume = 0
          // Remove audio tracks completely
          if (video.audioTracks) {
            for (let i = 0; i < video.audioTracks.length; i++) {
              video.audioTracks[i].enabled = false
            }
          }
        }
      })
    }

    // Force mute immediately and continuously
    const interval = setInterval(forceAllVideosMute, 100)
    forceAllVideosMute()

    return () => clearInterval(interval)
  }, [])

  const defaultVideos = [
    {
      url: "https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stack/1761523559750-David_Goggins-3.mov",
      poster:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='355'%3E%3Crect width='200' height='355' fill='%23000000'/%3E%3C/svg%3E",
    },
    {
      url: "https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stack/1761516695694-meme_template_.mp4",
      poster:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='355'%3E%3Crect width='200' height='355' fill='%23000000'/%3E%3C/svg%3E",
    },
    {
      url: "https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stack/1761523546935-Kendrick_Lamar-3.mov",
      poster:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='355'%3E%3Crect width='200' height='355' fill='%23000000'/%3E%3C/svg%3E",
    },
    {
      url: "https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stack/1761518381535-copy_5355E028-F224-40D3-8C19-2910957C4177.MOV",
      poster:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='355'%3E%3Crect width='200' height='355' fill='%23000000'/%3E%3C/svg%3E",
    },
    {
      url: "https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stack/1761523501219-Duke_Dennis_._Just_Keep_Going.mov",
      poster:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='355'%3E%3Crect width='200' height='355' fill='%23000000'/%3E%3C/svg%3E",
    },
    {
      url: "https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stack/1761516660802-Kai_cenat_._Find_Your_People.mov",
      poster:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='355'%3E%3Crect width='200' height='355' fill='%23000000'/%3E%3C/svg%3E",
    },
  ]

  const videoList = videos
    ? videos.map((url) => ({
        url,
        poster:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='355'%3E%3Crect width='200' height='355' fill='%23000000'/%3E%3C/svg%3E",
      }))
    : defaultVideos
  const duplicatedVideos = [...videoList, ...videoList]

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
          }
        })
      },
      { threshold: 0.1 },
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container || !isInView) return

    const videoCardWidth = 216
    const totalVideos = videoList.length
    const oneSetWidth = videoCardWidth * totalVideos

    const scrollSpeed = 1.5

    const animate = () => {
      scrollPositionRef.current += scrollSpeed

      if (scrollPositionRef.current >= oneSetWidth) {
        scrollPositionRef.current = 0
      }

      container.style.transform = `translateX(-${scrollPositionRef.current}px)`
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [videoList.length, isInView])

  useEffect(() => {
    if (!isInView) return

    const playVideos = async () => {
      for (const video of videoRefs.current) {
        if (video) {
          video.muted = true
          video.volume = 0
          if (video.audioTracks) {
            for (let i = 0; i < video.audioTracks.length; i++) {
              video.audioTracks[i].enabled = false
            }
          }
          try {
            await video.play()
          } catch (error) {
            // Silently handle autoplay prevention
          }
        }
      }
    }

    const timer = setTimeout(playVideos, 100)
    return () => clearTimeout(timer)
  }, [isInView])

  const nukeSound = (video: HTMLVideoElement) => {
    video.muted = true
    video.volume = 0
    if (video.audioTracks) {
      for (let i = 0; i < video.audioTracks.length; i++) {
        video.audioTracks[i].enabled = false
      }
    }
  }

  return (
    <div className="w-full overflow-hidden py-12 relative">
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-black to-transparent z-10" />

      <div ref={containerRef} className="flex gap-4 will-change-transform">
        {isInView &&
          duplicatedVideos.map((video, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-[200px] h-[355px] rounded-xl overflow-hidden bg-black border border-white/10"
            >
              <video
                ref={(el) => {
                  videoRefs.current[index] = el
                  if (el) {
                    nukeSound(el)
                  }
                }}
                src={video.url}
                poster={video.poster}
                autoPlay
                loop
                muted
                playsInline
                preload="none"
                className="w-full h-full object-cover"
                onLoadedMetadata={(e) => nukeSound(e.currentTarget)}
                onPlay={(e) => nukeSound(e.currentTarget)}
                onVolumeChange={(e) => {
                  const video = e.currentTarget
                  if (video.volume > 0 || !video.muted) {
                    nukeSound(video)
                  }
                }}
                onError={(e) => console.error(`[v0] Video ${index} failed to load:`, e)}
              />
            </div>
          ))}
      </div>
    </div>
  )
}
