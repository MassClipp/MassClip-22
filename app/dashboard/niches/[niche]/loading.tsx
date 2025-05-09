import { Skeleton } from "@/components/ui/skeleton"

export default function NicheLoading() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 pt-24 pb-16 max-w-6xl">
        <div className="mb-8">
          <Skeleton className="h-10 w-64 bg-zinc-800" />
          <Skeleton className="h-5 w-96 mt-2 bg-zinc-800" />
        </div>

        <Skeleton className="h-10 w-full mb-8 bg-zinc-800" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="aspect-video w-full rounded-xl bg-zinc-800" />
              <Skeleton className="h-6 w-3/4 bg-zinc-800" />
              <Skeleton className="h-4 w-1/2 bg-zinc-800" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
