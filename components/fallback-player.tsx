"use client"

interface FallbackPlayerProps {
  src: string
  title?: string
  aspectRatio?: "16/9" | "9/16" | "1/1"
}

export default function FallbackPlayer({ src, title, aspectRatio = "16/9" }: FallbackPlayerProps) {
  return (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio }}>
      <iframe
        src={`https://iframe.mediadelivery.net/embed/player?url=${encodeURIComponent(src)}`}
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title={title || "Video player"}
      ></iframe>

      {title && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <h3 className="text-white font-medium truncate">{title}</h3>
        </div>
      )}
    </div>
  )
}
