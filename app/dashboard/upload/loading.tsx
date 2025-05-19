import { Skeleton } from "@/components/ui/skeleton"

export default function UploadLoading() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <Skeleton className="h-8 w-64 bg-zinc-800" />
        <Skeleton className="h-4 w-48 mt-2 bg-zinc-800" />
      </div>

      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-lg bg-zinc-800" />

        <div className="space-y-4">
          <Skeleton className="h-4 w-24 bg-zinc-800" />
          <Skeleton className="h-10 w-full bg-zinc-800" />
        </div>

        <div className="space-y-4">
          <Skeleton className="h-4 w-32 bg-zinc-800" />
          <Skeleton className="h-24 w-full bg-zinc-800" />
        </div>

        <Skeleton className="h-16 w-full rounded-lg bg-zinc-800" />

        <div className="flex justify-end gap-3">
          <Skeleton className="h-10 w-24 bg-zinc-800" />
          <Skeleton className="h-10 w-32 bg-zinc-800" />
        </div>
      </div>
    </div>
  )
}
