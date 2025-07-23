"use client"

import { Loader2 } from "lucide-react"

/**
 * Fallback UI while the Connect-Stripe page is being streamed.
 * Required so that `useSearchParams()` can be used safely within
 * the route without throwing the Suspense boundary warning.
 */
export default function Loading() {
  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
      <span className="ml-3 text-sm text-muted-foreground">Preparing Stripe Connect&hellip;</span>
    </div>
  )
}
