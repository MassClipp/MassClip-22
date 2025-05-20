"use client"

interface RawVideoPlayerProps {
  videoUrl: string
}

export default function RawVideoPlayer({ videoUrl }: RawVideoPlayerProps) {
  return (
    <div className="w-full" style={{ aspectRatio: "9/16" }}>
      <video src={videoUrl} controls autoPlay playsInline className="w-full h-full object-cover rounded-lg">
        Your browser does not support the video tag.
      </video>
    </div>
  )
}
