"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function VimeoDiagnosticPage() {
  const [diagnosticData, setDiagnosticData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runDiagnostic = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/vimeo/diagnostic")

      if (!response.ok) {
        throw new Error(`Diagnostic failed with status: ${response.status}`)
      }

      const data = await response.json()
      setDiagnosticData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runDiagnostic()
  }, [])

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-zinc-800/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Dashboard</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-24 pb-16 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Vimeo Diagnostic</h1>
          <p className="text-zinc-400">Troubleshoot Vimeo API connection and upload issues</p>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 md:p-8 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-medium">Diagnostic Results</h2>
            <Button
              onClick={runDiagnostic}
              disabled={loading}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              {loading ? "Running..." : "Run Again"}
            </Button>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6 text-red-300">
              <p className="font-medium mb-1">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {loading && !diagnosticData && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
          )}

          {diagnosticData && (
            <div className="space-y-6">
              {/* Config Validation */}
              <div>
                <h3 className="text-lg font-medium mb-3">Configuration</h3>
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <div
                      className={`w-3 h-3 rounded-full mr-2 ${diagnosticData.configValidation.isValid ? "bg-green-500" : "bg-red-500"}`}
                    ></div>
                    <p className="font-medium">
                      {diagnosticData.configValidation.isValid ? "Valid Configuration" : "Invalid Configuration"}
                    </p>
                  </div>

                  {diagnosticData.configValidation.issues.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-red-400 mb-1">Issues:</p>
                      <ul className="list-disc list-inside text-sm text-zinc-400">
                        {diagnosticData.configValidation.issues.map((issue: string, i: number) => (
                          <li key={i}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-3 text-sm text-zinc-500">
                    <p>User ID: {diagnosticData.configValidation.config.userId}</p>
                    <p>Access Token: {diagnosticData.configValidation.config.accessToken}</p>
                  </div>
                </div>
              </div>

              {/* API Connection */}
              <div>
                <h3 className="text-lg font-medium mb-3">API Connection</h3>
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <div
                      className={`w-3 h-3 rounded-full mr-2 ${diagnosticData.apiConnection.ok ? "bg-green-500" : "bg-red-500"}`}
                    ></div>
                    <p className="font-medium">
                      {diagnosticData.apiConnection.ok ? "Connected Successfully" : "Connection Failed"}
                    </p>
                  </div>

                  <p className="text-sm text-zinc-400">Status: {diagnosticData.apiConnection.status}</p>

                  {diagnosticData.apiConnection.error && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-red-400 mb-1">Error:</p>
                      <pre className="text-xs bg-zinc-900 p-2 rounded overflow-auto max-h-32">
                        {typeof diagnosticData.apiConnection.error === "string"
                          ? diagnosticData.apiConnection.error
                          : JSON.stringify(diagnosticData.apiConnection.error, null, 2)}
                      </pre>
                    </div>
                  )}

                  {diagnosticData.apiConnection.data && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-green-400 mb-1">Response:</p>
                      <pre className="text-xs bg-zinc-900 p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(diagnosticData.apiConnection.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Capabilities */}
              <div>
                <h3 className="text-lg font-medium mb-3">Upload Capabilities</h3>
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <div
                      className={`w-3 h-3 rounded-full mr-2 ${diagnosticData.uploadCapabilities.data ? "bg-green-500" : "bg-red-500"}`}
                    ></div>
                    <p className="font-medium">
                      {diagnosticData.uploadCapabilities.data
                        ? "Upload Capabilities Available"
                        : "Upload Capabilities Unavailable"}
                    </p>
                  </div>

                  {diagnosticData.uploadCapabilities.error && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-red-400 mb-1">Error:</p>
                      <pre className="text-xs bg-zinc-900 p-2 rounded overflow-auto max-h-32">
                        {typeof diagnosticData.uploadCapabilities.error === "string"
                          ? diagnosticData.uploadCapabilities.error
                          : JSON.stringify(diagnosticData.uploadCapabilities.error, null, 2)}
                      </pre>
                    </div>
                  )}

                  {diagnosticData.uploadCapabilities.data && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-green-400 mb-1">Capabilities:</p>
                      <pre className="text-xs bg-zinc-900 p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(diagnosticData.uploadCapabilities.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-xs text-zinc-500 text-right">
                Last updated: {new Date(diagnosticData.timestamp).toLocaleString()}
              </div>
            </div>
          )}
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 md:p-8">
          <h2 className="text-xl font-medium mb-4">Troubleshooting Steps</h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">1. Check Vimeo API Access</h3>
              <p className="text-sm text-zinc-400">
                Ensure your Vimeo access token has the correct permissions for uploading videos. The token needs{" "}
                <span className="text-white">upload</span> and <span className="text-white">edit</span> scopes.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">2. Verify Upload Quota</h3>
              <p className="text-sm text-zinc-400">
                Check if your Vimeo account has sufficient upload quota remaining. Free accounts have limited weekly
                upload capacity.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">3. Check File Size</h3>
              <p className="text-sm text-zinc-400">
                Ensure your file size is within the limits of your Vimeo account plan. Free accounts have a 500MB per
                file limit.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">4. Network Issues</h3>
              <p className="text-sm text-zinc-400">
                Ensure you have a stable internet connection. Large uploads require consistent connectivity.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">5. Contact Support</h3>
              <p className="text-sm text-zinc-400">
                If issues persist, contact support with the diagnostic information from this page.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
