export default function SetupProfileLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full mx-auto p-6 bg-zinc-900 rounded-lg shadow-lg border border-zinc-800 animate-pulse">
        <div className="h-8 bg-zinc-800 rounded mb-6"></div>

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-5 bg-zinc-800 rounded w-1/4"></div>
            <div className="h-10 bg-zinc-800 rounded"></div>
            <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
          </div>

          <div className="space-y-2">
            <div className="h-5 bg-zinc-800 rounded w-1/3"></div>
            <div className="h-10 bg-zinc-800 rounded"></div>
            <div className="h-4 bg-zinc-800 rounded w-2/3"></div>
          </div>

          <div className="space-y-2">
            <div className="h-5 bg-zinc-800 rounded w-1/4"></div>
            <div className="h-24 bg-zinc-800 rounded"></div>
          </div>

          <div className="h-10 bg-zinc-700 rounded"></div>
        </div>
      </div>
    </div>
  )
}
