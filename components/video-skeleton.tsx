"use client"

export function VideoSkeleton() {
  return (
    <div className="flex-shrink-0 w-[160px]">
      <div
        className="relative rounded-xl overflow-hidden bg-zinc-900/50"
        style={{
          paddingBottom: "177.78%", // 9:16 aspect ratio
          height: 0,
        }}
      >
        <div className="absolute inset-0 shimmer"></div>
      </div>
      <div className="mt-2 h-4 bg-zinc-900/50 rounded-md shimmer"></div>
      <div className="mt-1 h-4 w-2/3 bg-zinc-900/50 rounded-md shimmer"></div>
    </div>
  )
}

// Keep default export for backward compatibility
export default VideoSkeleton
