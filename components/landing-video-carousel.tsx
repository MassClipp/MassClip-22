"use client"

interface LandingVideoCarouselProps {
  videos?: string[]
}

export function LandingVideoCarousel({ videos }: LandingVideoCarouselProps) {
  const defaultVideos = [
    "https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stack/1761516695694-meme_template_.mp4",
    "https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stack/1761518381535-copy_5355E028-F224-40D3-8C19-2910957C4177.MOV",
    "https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stack/1761516660802-Kai_cenat_._Find_Your_People.mov",
    "https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stacksavvy8/1759800861066-Damii_._Daddy_s_Money.mov",
    "https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stack/1761518373402-copy_50F95DCD-C28B-4F19-8C09-4A861A5900D4.MOV",
    "https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stack/1761516709035-Kendall_Jenner__Words_of_Affirmation__4_.mp4",
    "https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stack/1761518457191-Kobe_._Fear_of_Failure.mov",
    "https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stack/1761518397253-copy_20C7EB0F-9989-4FC6-A8EB-E991FFB2FCB9.MOV",
    "https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stack/1761516755340-micheal_b___jordan_._don_t_quit__1080p_.mp4",
    "https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stack/Motivation/1761518902497-copy_7CA7D980-2ACC-4AF7-A6CA-FCC94537E1CA.MOV",
  ]

  const videoList = videos || defaultVideos
  const duplicatedVideos = [...videoList, ...videoList, ...videoList]

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
            /* Calculate based on one-third of content for seamless loop */
            transform: translateX(calc(-100% / 3));
          }
        }

        .animate-scroll-right {
          /* Reduced from 30s to 40s for faster scroll, using will-change for better mobile performance */
          animation: scroll-right 40s linear infinite;
          will-change: transform;
        }
      `}</style>
    </div>
  )
}
