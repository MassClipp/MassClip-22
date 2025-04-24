export default function VideoSkeleton() {
  return (
    <div className="flex-shrink-0 w-[160px] animate-pulse">
      <div
        style={{
          position: "relative",
          paddingBottom: "177.78%", // 9:16 aspect ratio
          height: 0,
          borderRadius: "4px",
          overflow: "hidden",
          backgroundColor: "#1a1a1a",
        }}
      >
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-800/10 to-transparent shimmer" />
      </div>
      <div className="mt-1 h-3 w-3/4 bg-gray-800 rounded" />
    </div>
  )
}
