import { Suspense } from "react"
import EarningsPageContent from "./earnings-content"
import { Loader2 } from "lucide-react"

function EarningsPageLoading() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 text-zinc-500 animate-spin mx-auto" />
        <div className="space-y-2">
          <p className="text-lg font-medium text-white">Loading earnings...</p>
          <p className="text-sm text-zinc-400">Please wait</p>
        </div>
      </div>
    </div>
  )
}

export default function EarningsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<EarningsPageLoading />}>
        <EarningsPageContent />
      </Suspense>
    </div>
  )
}
