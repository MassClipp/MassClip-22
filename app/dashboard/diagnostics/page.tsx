import DownloadDiagnosticRunner from "@/components/download-diagnostic-runner"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Download Diagnostics | MassClip",
  description: "Diagnose and fix download issues in your MassClip application",
}

export default function DiagnosticsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6 text-white">Download Diagnostics</h1>
      <DownloadDiagnosticRunner />
    </div>
  )
}
