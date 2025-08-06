import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function EarningsLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="space-y-8">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 bg-zinc-800" />
            <Skeleton className="h-4 w-96 bg-zinc-800" />
          </div>
          <Skeleton className="h-10 w-24 bg-zinc-800" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="bg-zinc-900/60 border-zinc-800/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24 bg-zinc-800" />
                <Skeleton className="h-4 w-4 bg-zinc-800" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 bg-zinc-800 mb-2" />
                <Skeleton className="h-3 w-16 bg-zinc-800" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Account Status Skeleton */}
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardHeader>
            <Skeleton className="h-6 w-48 bg-zinc-800" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24 bg-zinc-800" />
                  <Skeleton className="h-6 w-16 bg-zinc-800" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Transactions Skeleton */}
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <Skeleton className="h-6 w-40 bg-zinc-800" />
            <Skeleton className="h-8 w-20 bg-zinc-800" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32 bg-zinc-800" />
                    <Skeleton className="h-3 w-20 bg-zinc-800" />
                  </div>
                  <div className="text-right space-y-2">
                    <Skeleton className="h-4 w-16 bg-zinc-800" />
                    <Skeleton className="h-5 w-12 bg-zinc-800" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
