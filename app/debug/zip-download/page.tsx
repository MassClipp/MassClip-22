"use client"

import { useState } from "react"
import { useFirebaseAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, RefreshCw } from "lucide-react"

export default function ZipDownloadDebugPage() {
  const { user } = useFirebaseAuth()
  const [bundleId, setBundleId] = useState("")
  const [sessionId, setSessionId] = useState("")
  const [debugLogs, setDebugLogs] = useState<string[]>([])
  const [testing, setTesting] = useState(false)

  const addLog = (message: string) => {
    setDebugLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
    console.log("[v0 ZIP Debug]", message)
  }

  const testBuyerZipDownload = async () => {
    if (!bundleId || !sessionId) {
      addLog("❌ Missing bundleId or sessionId")
      return
    }

    setTesting(true)
    setDebugLogs([])

    try {
      addLog(`🔍 Testing buyer ZIP download for bundle: ${bundleId}`)
      addLog(`📝 Session ID: ${sessionId}`)

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      }

      if (user) {
        const token = await user.getIdToken()
        headers["Authorization"] = `Bearer ${token}`
        addLog(`✅ User authenticated: ${user.uid}`)
      } else {
        addLog(`⚠️ No user authentication`)
      }

      addLog(`📡 Calling /api/bundles/${bundleId}/download-zip-buyer`)

      const response = await fetch(`/api/bundles/${bundleId}/download-zip-buyer`, {
        method: "POST",
        headers,
        body: JSON.stringify({ sessionId }),
      })

      addLog(`📊 Response status: ${response.status}`)
      addLog(`📊 Response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}`)

      if (!response.ok) {
        const error = await response.json()
        addLog(`❌ Error response: ${JSON.stringify(error, null, 2)}`)
        throw new Error(error.error || "Failed to download ZIP")
      }

      const contentType = response.headers.get("content-type")
      const contentDisposition = response.headers.get("content-disposition")
      const contentLength = response.headers.get("content-length")

      addLog(`📦 Content-Type: ${contentType}`)
      addLog(`📦 Content-Disposition: ${contentDisposition}`)
      addLog(`📦 Content-Length: ${contentLength} bytes`)

      // Get the ZIP file as a blob
      const blob = await response.blob()
      addLog(`✅ Received blob: ${blob.size} bytes, type: ${blob.type}`)

      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `debug-test.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      addLog(`✅ ZIP download triggered successfully`)
    } catch (error) {
      addLog(`❌ Error: ${error instanceof Error ? error.message : String(error)}`)
      console.error("[v0 ZIP Debug] Error:", error)
    } finally {
      setTesting(false)
    }
  }

  const testCreatorZipDownload = async () => {
    if (!bundleId) {
      addLog("❌ Missing bundleId")
      return
    }

    if (!user) {
      addLog("❌ User not authenticated")
      return
    }

    setTesting(true)
    setDebugLogs([])

    try {
      addLog(`🔍 Testing creator ZIP download for bundle: ${bundleId}`)
      addLog(`✅ User authenticated: ${user.uid}`)

      const token = await user.getIdToken()
      addLog(`📡 Calling /api/bundles/${bundleId}/download-zip`)

      const response = await fetch(`/api/bundles/${bundleId}/download-zip`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      addLog(`📊 Response status: ${response.status}`)
      addLog(`📊 Response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}`)

      if (!response.ok) {
        const error = await response.json()
        addLog(`❌ Error response: ${JSON.stringify(error, null, 2)}`)
        throw new Error(error.error || "Failed to download ZIP")
      }

      const contentType = response.headers.get("content-type")
      const contentDisposition = response.headers.get("content-disposition")
      const contentLength = response.headers.get("content-length")

      addLog(`📦 Content-Type: ${contentType}`)
      addLog(`📦 Content-Disposition: ${contentDisposition}`)
      addLog(`📦 Content-Length: ${contentLength} bytes`)

      // Get the ZIP file as a blob
      const blob = await response.blob()
      addLog(`✅ Received blob: ${blob.size} bytes, type: ${blob.type}`)

      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `debug-test-creator.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      addLog(`✅ ZIP download triggered successfully`)
    } catch (error) {
      addLog(`❌ Error: ${error instanceof Error ? error.message : String(error)}`)
      console.error("[v0 ZIP Debug] Error:", error)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold mb-8">ZIP Download Debug</h1>

        <Card className="bg-white/5 border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Test Buyer ZIP Download (Purchase Success)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Bundle ID</label>
              <input
                type="text"
                value={bundleId}
                onChange={(e) => setBundleId(e.target.value)}
                placeholder="Enter bundle ID"
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Session ID</label>
              <input
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="Enter session ID"
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500"
              />
            </div>

            <div className="flex gap-4">
              <Button
                onClick={testBuyerZipDownload}
                disabled={testing || !bundleId || !sessionId}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {testing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Test Buyer Download
                  </>
                )}
              </Button>

              <Button
                onClick={testCreatorZipDownload}
                disabled={testing || !bundleId || !user}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                {testing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Test Creator Download
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Debug Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-black/50 border border-white/10 rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto">
              {debugLogs.length === 0 ? (
                <p className="text-gray-500">No logs yet. Run a test to see debug output.</p>
              ) : (
                debugLogs.map((log, index) => (
                  <div key={index} className="text-gray-300 mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Instructions</CardTitle>
          </CardHeader>
          <CardContent className="text-gray-400 space-y-2">
            <p>1. Enter a Bundle ID (from a bundle you have access to)</p>
            <p>2. For buyer download: Enter the Session ID from a completed purchase</p>
            <p>3. Click "Test Buyer Download" to test the purchase success page ZIP download</p>
            <p>4. Click "Test Creator Download" to test the bundle content page ZIP download (working version)</p>
            <p>5. Check the debug logs to see what's happening</p>
            <p>6. Compare the two downloaded ZIPs to see the difference</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
