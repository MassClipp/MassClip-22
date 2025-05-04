"use client"

import { Suspense } from "react"
import dynamic from "next/dynamic"
import BrowseAllFallback from "./fallback"

// Import the client component dynamically with ssr: false
const ClientBrowseAll = dynamic(() => import("./client-component"), {
  ssr: false,
  loading: () => <BrowseAllFallback />,
})

export default function ClientWrapper() {
  return (
    <Suspense fallback={<BrowseAllFallback />}>
      <ClientBrowseAll />
    </Suspense>
  )
}
