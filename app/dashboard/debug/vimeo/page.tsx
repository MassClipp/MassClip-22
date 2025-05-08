"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, RefreshCw, CheckCircle, XCircle, AlertTriangle } from "lucide-react"

export default function VimeoDebugPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [configData, setConfigData] = useState<any>(null)

  const fetchDebugInfo = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/vimeo/debug-config")
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      setConfigData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDebugInfo()
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
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Vimeo Integration Debug</h1>
          <p className="text-zinc-400">Diagnose issues with your Vimeo integration</p>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 md:p-8 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Vimeo Configuration Status</h2>
            <Button
              onClick={fetchDebugInfo}
              variant="outline"
              size="sm"
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-zinc-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-4 text-red-400">
              <p className="flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                {error}
              </p>
            </div>
          ) : configData ? (
            <div className="space-y-6">
              {/* Configuration Status */}
              <div>
                <h3 className="text-lg font-medium mb-4">Environment Variables</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-zinc-800/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {configData.config.hasAccessToken ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <span className="font-medium">Access Token</span>
                    </div>
                    <p className="text-sm text-zinc-400">
                      {configData.config.hasAccessToken
                        ? `Set: ${configData.config.accessTokenHint}`
                        : "Not set - This is required"}
                    </p>
                  </div>

                  <div className="bg-zinc-800/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {configData.config.hasUserId ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <span className="font-medium">User ID</span>
                    </div>
                    <p className="text-sm text-zinc-400">
                      {configData.config.hasUserId
                        ? `Set: ${configData.config.userIdHint}`
                        : "Not set - This is required"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Connection Test */}
              <div>
                <h3 className="text-lg font-medium mb-4">Vimeo API Connection Test</h3>
                {configData.connectionTest.success ? (
                  <div className="bg-green-900/20 border border-green-900/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="font-medium">Connection Successful</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-zinc-400 mb-1">Account Name</p>
                        <p className="font-medium">{configData.connectionTest.accountName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-400 mb-1">Account Type</p>
                        <p className="font-medium">{configData.connectionTest.accountType}</p>
                      </div>
                    </div>

                    {configData.connectionTest.uploadQuota && (
                      <div className="mt-4">
                        <p className="text-sm text-zinc-400 mb-2">Upload Quota</p>
                        <div className="bg-zinc-800/50 rounded-lg p-3 text-sm">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-zinc-400 mb-1">Free Space</p>
                              <p className="font-medium">
                                {(configData.connectionTest.uploadQuota.space.free / (1024 * 1024 * 1024)).toFixed(2)}{" "}
                                GB /{" "}
                                {(configData.connectionTest.uploadQuota.space.max / (1024 * 1024 * 1024)).toFixed(2)} GB
                              </p>
                            </div>
                            <div>
                              <p className="text-zinc-400 mb-1">Uploads Per Week</p>
                              <p className="font-medium">
                                {configData.connectionTest.uploadQuota.periodic.used} used /{" "}
                                {configData.connectionTest.uploadQuota.periodic.max} max
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="w-5 h-5 text-red-500" />
                      <span className="font-medium">Connection Failed</span>
                    </div>
                    <p className="text-sm text-zinc-400 mb-2">
                      {configData.connectionTest.error}: {configData.connectionTest.details}
                    </p>
                    <div className="mt-4 bg-zinc-800/50 rounded-lg p-3 text-sm">
                      <p className="text-zinc-400">Possible solutions:</p>
                      <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-300">
                        <li>Check that your Vimeo access token is valid and not expired</li>
                        <li>Verify that your Vimeo account is active and in good standing</li>
                        <li>Ensure your access token has the correct permissions (upload, edit, etc.)</li>
                        <li>Check your network connection and firewall settings</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Environment Info */}
              <div>
                <h3 className="text-lg font-medium mb-4">Environment Information</h3>
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <p className="text-sm">
                    <span className="text-zinc-400">Environment: </span>
                    <span className="font-medium">{configData.config.environment}</span>
                  </p>
                </div>
              </div>

              {/* Troubleshooting */}
              <div>
                <h3 className="text-lg font-medium mb-4">Troubleshooting Steps</h3>
                <div className="bg-zinc-800/50 rounded-lg p-4 space-y-4">
                  <div>
                    <p className="font-medium mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      Check Environment Variables
                    </p>
                    <p className="text-sm text-zinc-400">
                      Ensure that VIMEO_ACCESS_TOKEN and VIMEO_USER_ID are correctly set in your environment variables.
                    </p>
                  </div>

                  <div>
                    <p className="font-medium mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      Verify Vimeo API Access
                    </p>
                    <p className="text-sm text-zinc-400">
                      Make sure your Vimeo access token has the necessary permissions for uploading videos.
                    </p>
                  </div>

                  <div>
                    <p className="font-medium mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      Check Upload Quota
                    </p>
                    <p className="text-sm text-zinc-400">
                      Verify that your Vimeo account has sufficient upload quota remaining.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex justify-between">
          <Link href="/dashboard/upload" className="text-zinc-400 hover:text-white transition-colors">
            Return to Upload Page
          </Link>

          <Link
            href="https://developer.vimeo.com/apps"
            target="_blank"
            rel="noopener noreferrer"
            className="text-crimson hover:text-crimson-light transition-colors"
          >
            Vimeo Developer Dashboard
          </Link>
        </div>
      </main>
    </div>
  )
}
