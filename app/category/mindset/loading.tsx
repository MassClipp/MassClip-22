export default function Loading() {
  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Premium Gradient Background */}
      <div className="fixed inset-0 z-0 premium-gradient">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-soft-light"></div>
      </div>

      <main className="relative z-10 container mx-auto px-4 py-8 pt-20">
        <div className="mb-8">
          <div className="h-10 w-20 bg-zinc-900/50 rounded-md animate-pulse"></div>
        </div>

        <div className="mb-8">
          <div className="h-12 w-48 bg-zinc-900/50 rounded-md animate-pulse mb-4"></div>
          <div className="h-4 w-full max-w-2xl bg-zinc-900/50 rounded-md animate-pulse"></div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={`skeleton-${index}`} className="aspect-[9/16] bg-zinc-900/50 rounded-md animate-pulse"></div>
          ))}
        </div>
      </main>
    </div>
  )
}
