"use client"

interface LandingVideoCarouselProps {
  videos?: string[]
}

export function LandingVideoCarousel({ videos }: LandingVideoCarouselProps) {
  // Default placeholder videos - replace with your R2 URLs
  const defaultVideos = [
    "/placeholder-video-1.mp4",
    "/placeholder-video-2.mp4",
    "/placeholder-video-3.mp4",
    "/placeholder-video-4.mp4",
    "/placeholder-video-5.mp4",
    "/placeholder-video-6.mp4",
  ]

  const videoList = videos || defaultVideos
  // Duplicate videos for seamless infinite loop
  const duplicatedVideos = [...videoList, ...videoList]

  return (
    <div className="w-full overflow-hidden py-12 relative">
      {/* Gradient overlays for fade effect */}
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-black to-transparent z-10" />

      {/* Scrolling container */}
      <div className="flex gap-4 animate-scroll-right">
        {duplicatedVideos.map((videoUrl, index) => (
          <div
            key={index}
            className="flex-shrink-0 w-[200px] h-[355px] rounded-xl overflow-hidden bg-white/5 backdrop-blur-sm border border-white/10"
          >
            <video src={videoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes scroll-right {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .animate-scroll-right {
          animation: scroll-right 30s linear infinite;
        }

        .animate-scroll-right:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  )
}
