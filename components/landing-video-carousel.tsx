"use client"

import { useEffect, useRef } from "react"

interface LandingVideoCarouselProps {
  videos?: string[]
}

export function LandingVideoCarousel({ videos }: LandingVideoCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollPositionRef = useRef(0)
  const animationFrameRef = useRef<number>()

  const defaultVideos = [
    "https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stack/1761523559750-David_Goggins-3.mov",
    "https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stack/1761516695694-meme_template_.mp4",
    "https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stack/1761523546935-Kendrick_Lamar-3.mov",
    "https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stack/1761518381535-copy_5355E028-F224-40D3-8C19-2910957C4177.MOV",
    "https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stack/1761523501219-Duke_Dennis_._Just_Keep_Going.mov",
    "https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stack/1761516660802-Kai_cenat_._Find_Your_People.mov",
    "https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stacksavvy8/1759800861066-Damii_._Daddy_s_Money.mov",
    "https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stack/1761523453342-copy_28A05EB0-CF35-4117-AD82-0C4A513E4D7F.MOV",
    "https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stack/1761518373402-copy_50F95DCD-C28B-4F19-8C09-4A861A5900D4.MOV",
    "https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stack/1761523440509-copy_24358EA8-1EE2-4843-B48B-968BE49D7A5C.MOV",
    "https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stack/1761516709035-Kendall_Jenner__Words_of_Affirmation__4_.mp4",
    "https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stack/1761523414889-copy_F5579482-B1ED-4F76-96D5-AA0FD07451C1.MOV",
    "https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stack/1761518457191-Kobe_._Fear_of_Failure.mov",
    "https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stack/1761523412296-copy_FE237F99-7EBF-430E-ABE0-2A472F2B6324.MOV",
    "https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stack/1761518397253-copy_20C7EB0F-9989-4FC6-A8EB-E991FFB2FCB9.MOV",
    "https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stack/1761516755340-micheal_b___jordan_._don_t_quit__1080p_.mp4",
    "https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stack/Motivation/1761518902497-copy_7CA7D980-2ACC-4AF7-A6CA-FCC94537E1CA.MOV",
  ]

  const videoList = videos || defaultVideos
  const duplicatedVideos = [...videoList, ...videoList]

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

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
  }, [videoList.length])

  return (
    <div className="w-full overflow-hidden py-12 relative">
      {/* Gradient overlays for fade effect */}
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-black to-transparent z-10" />

      <div ref={containerRef} className="flex gap-4 will-change-transform">
        {duplicatedVideos.map((videoUrl, index) => (
          <div
            key={index}
            className="flex-shrink-0 w-[200px] h-[355px] rounded-xl overflow-hidden bg-white/5 backdrop-blur-sm border border-white/10"
          >
            <video
              src={videoUrl}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
