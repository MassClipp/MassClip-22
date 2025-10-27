import type { Metadata } from "next"
import BundleIntegrityDiagnostic from "@/components/diagnostics/bundle-integrity-diagnostic"

export const metadata: Metadata = {
  title: "Bundle Integrity Diagnostic | MassClip",
  description: "Analyze and verify bundle content metadata integrity",
}

export default function BundleIntegrityDiagnosticPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Bundle Data Integrity Diagnostic</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Comprehensive analysis of bundle content metadata, storage integrity, and data consistency. This diagnostic
            tool verifies that all content metadata including Cloudflare R2 links, titles, and other critical
            information is properly recorded and stored.
          </p>
        </div>

        <BundleIntegrityDiagnostic />
      </div>
    </div>
  )
}
