"use client"
import WebhookDiagnosticClient from "./WebhookDiagnosticClient"

export const dynamic = "force-dynamic" // ensure this route is rendered at runtime

/**
 * Server wrapper that simply streams the client component.
 * Keeps Auth logic in the browser and prevents build-time errors.
 */
export default function WebhookDiagnosticPage() {
  return <WebhookDiagnosticClient />
}

// Client component logic can remain in WebhookDiagnosticClient.tsx
