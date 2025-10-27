export default function RecentlyAddedLoading() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex space-x-2">
        <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce"></div>
      </div>
    </div>
  )
}
