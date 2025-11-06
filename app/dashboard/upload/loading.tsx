import { Skeleton } from "@/components/ui/skeleton"

export default function UploadLoading() {
  return (
    <div className="container mx-auto py-8 px-4">
      <Skeleton className="h-10 w-64 mx-auto mb-8" />

      <div className="max-w-md mx-auto mb-8">
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>

      <div className="max-w-4xl mx-auto">
        <Skeleton className="h-[600px] w-full rounded-lg" />
      </div>
    </div>
  )
}
