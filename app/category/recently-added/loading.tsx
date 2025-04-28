import { Clock } from "lucide-react"

export default function RecentlyAddedLoading() {
  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Premium Gradient Background */}
      <div className="fixed inset-0 z-0 premium-gradient">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-soft-light"></div>
      </div>

      <main className="pt-20 pb-16 relative z-10 px-6">
        <div className="mb-8">
          <div className="h-10 w-20 bg-zinc-900/50 rounded-md animate-pulse mb-6"></div>

          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-zinc-900/50 rounded-sm flex items-center justify-center mr-4">
              <Clock className="h-5 w-5 text-crimson" />
            </div>
            <div className="h-8 w-48 bg-zinc-900/50 rounded-md animate-pulse"></div>
          </div>

          <div className="h-4 w-96 bg-zinc-900/50 rounded-md animate-pulse"></div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={`skeleton-${index}`} className="aspect-[9/16] rounded-md bg-zinc-900/50 animate-pulse"></div>
          ))}
        </div>
      </main>
    </div>
  )
}
