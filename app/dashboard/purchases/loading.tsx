export default function PurchasesLoading() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <div className="h-8 w-48 bg-zinc-800 rounded animate-pulse"></div>
          <div className="h-4 w-64 bg-zinc-800 rounded animate-pulse mt-2"></div>
        </div>
        <div className="h-10 w-24 bg-zinc-800 rounded animate-pulse"></div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 h-10 bg-zinc-800 rounded animate-pulse"></div>
        <div className="w-[180px] h-10 bg-zinc-800 rounded animate-pulse"></div>
        <div className="w-[180px] h-10 bg-zinc-800 rounded animate-pulse"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-zinc-800 rounded animate-pulse"></div>
        ))}
      </div>

      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-zinc-800 rounded animate-pulse"></div>
        ))}
      </div>
    </div>
  )
}
