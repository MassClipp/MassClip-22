export default function VideosLoading() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div className="h-8 w-32 bg-zinc-800 rounded-md animate-pulse"></div>
        <div className="h-10 w-40 bg-zinc-800 rounded-md animate-pulse"></div>
      </div>

      <div className="h-12 bg-zinc-800 rounded-md animate-pulse mb-6"></div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <div className="aspect-video bg-zinc-800 animate-pulse"></div>
            <div className="p-4">
              <div className="h-5 bg-zinc-800 rounded animate-pulse mb-2"></div>
              <div className="h-4 bg-zinc-800 rounded animate-pulse w-3/4 mb-4"></div>
              <div className="flex justify-between">
                <div className="h-8 w-20 bg-zinc-800 rounded animate-pulse"></div>
                <div className="h-8 w-20 bg-zinc-800 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
