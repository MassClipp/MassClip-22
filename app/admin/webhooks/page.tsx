import dynamic from "next/dynamic"

/**
 * Make this route render ONLY on the client so hooks like `useAuth`
 * are never executed during the build.
 */
const ForceDynamic = "force-dynamic"

const WebhookDiagnosticClient = dynamic(() => import("./WebhookDiagnosticClient"), { ssr: false })

export default function WebhookDiagnosticPage() {
  return <WebhookDiagnosticClient />
}
