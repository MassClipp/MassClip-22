"use client"

import dynamic from "next/dynamic"

/**
 * Loads the heavy client implementation *only* in the browser.
 * Setting `ssr: false` here is valid because this is a Client Component.
 */
const DeploymentAdminClient = dynamic(() => import("./DeploymentAdminClient"), { ssr: false, loading: () => null })

export default function DeploymentAdminWrapper() {
  return <DeploymentAdminClient />
}
