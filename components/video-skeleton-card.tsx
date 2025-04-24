import { cn } from "@/lib/utils"

interface VideoSkeletonCardProps {
  className?: string
  showViewedDate?: boolean
}

export default function VideoSkeletonCard({ className, showViewedDate = false }: VideoSkeletonCardProps) {
  return (
    <div className={cn("flex-shrink-0 w-[160px] animate-pulse", className)}>
      <div
        className="relative rounded-md overflow-hidden bg-gray-800"
        style={{
          paddingBottom: "177.78%", // 9:16 aspect ratio
        }}
      >
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-700/20 to-transparent shimmer" />
      </div>

      {/* Title skeleton */}
      <div className="mt-2 h-3 w-3/4 bg-gray-800 rounded" />

      {/* Viewed date skeleton (optional) */}
      {showViewedDate && <div className="mt-1 h-2 w-1/2 bg-gray-800 rounded" />}
    </div>
  )
}
