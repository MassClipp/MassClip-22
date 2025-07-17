"use client"

import dynamic from "next/dynamic"

// Dynamically import the client component with SSR disabled
const DeploymentAdminClient = dynamic(() => import("./DeploymentAdminClient"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p>Loading deployment admin...</p>
      </div>
    </div>
  ),
})

export default function DeploymentAdminWrapper() {
  return <DeploymentAdminClient />
}
