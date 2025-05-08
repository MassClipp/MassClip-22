"use client"

import { useState } from "react"
import { AlertCircle, CheckCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export function UploadNetworkDiagnostic() {
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<{
    vimeoApi: boolean | null
    internetConnection: boolean | null
    uploadSpeed: number | null
    browserStorage: boolean | null
  }>({
    vimeoApi: null,
    internetConnection: null,
    uploadSpeed: null,
    browserStorage: null,
  })

  const runDiagnostics = async () => {
    setIsRunning(true)
    setResults({
      vimeoApi: null,
      internetConnection: null,
      uploadSpeed: null,
      browserStorage: null,
    })

    // Check internet connection
    try {
      const connectionCheck = await fetch("https://www.google.com", {
        method: "HEAD",
        mode: "no-cors",
        cache: "no-store",
      })
      setResults((prev) => ({ ...prev, internetConnection: true }))
    } catch (error) {
      setResults((prev) => ({ ...prev, internetConnection: false }))
    }

    // Check Vimeo API
    try {
      const vimeoCheck = await fetch("/api/vimeo/rate-limit-check", {
        method: "GET",
        cache: "no-store",
      })
      const vimeoData = await vimeoCheck.json()
      setResults((prev) => ({ ...prev, vimeoApi: vimeoCheck.ok }))
    } catch (error) {
      setResults((prev) => ({ ...prev, vimeoApi: false }))
    }

    // Check upload speed
    try {
      const startTime = Date.now()
      // Create a 1MB test file
      const testData = new Uint8Array(1024 * 1024)
      for (let i = 0; i < testData.length; i++) {
        testData[i] = Math.floor(Math.random() * 256)
      }
      const testBlob = new Blob([testData], { type: "application/octet-stream" })

      // Upload the test file
      const formData = new FormData()
      formData.append("testFile", testBlob)

      const uploadTest = await fetch("/api/upload-speed-test", {
        method: "POST",
        body: formData,
      })

      const endTime = Date.now()
      const durationSeconds = (endTime - startTime) / 1000
      const speedMbps = 1 / durationSeconds

      setResults((prev) => ({ ...prev, uploadSpeed: speedMbps }))
    } catch (error) {
      setResults((prev) => ({ ...prev, uploadSpeed: 0 }))
    }

    // Check browser storage
    try {
      const testKey = `test_${Date.now()}`
      localStorage.setItem(testKey, "test")
      const testValue = localStorage.getItem(testKey)
      localStorage.removeItem(testKey)

      setResults((prev) => ({ ...prev, browserStorage: testValue === "test" }))
    } catch (error) {
      setResults((prev) => ({ ...prev, browserStorage: false }))
    }

    setIsRunning(false)
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Upload Diagnostics</h3>
        <Button variant="outline" size="sm" onClick={runDiagnostics} disabled={isRunning} className="text-xs">
          {isRunning ? (
            <>
              <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
              Running...
            </>
          ) : (
            "Run Diagnostics"
          )}
        </Button>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-zinc-400">Internet Connection</span>
          {results.internetConnection === null ? (
            <span className="text-zinc-500">Not tested</span>
          ) : results.internetConnection ? (
            <span className="text-green-500 flex items-center">
              <CheckCircle className="w-4 h-4 mr-1" /> Connected
            </span>
          ) : (
            <span className="text-red-500 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" /> Issue detected
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-zinc-400">Vimeo API</span>
          {results.vimeoApi === null ? (
            <span className="text-zinc-500">Not tested</span>
          ) : results.vimeoApi ? (
            <span className="text-green-500 flex items-center">
              <CheckCircle className="w-4 h-4 mr-1" /> Available
            </span>
          ) : (
            <span className="text-red-500 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" /> Issue detected
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-zinc-400">Upload Speed</span>
          {results.uploadSpeed === null ? (
            <span className="text-zinc-500">Not tested</span>
          ) : results.uploadSpeed > 1 ? (
            <span className="text-green-500 flex items-center">
              <CheckCircle className="w-4 h-4 mr-1" /> {results.uploadSpeed.toFixed(1)} Mbps (Good)
            </span>
          ) : results.uploadSpeed > 0.5 ? (
            <span className="text-yellow-500 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" /> {results.uploadSpeed.toFixed(1)} Mbps (Slow)
            </span>
          ) : (
            <span className="text-red-500 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" /> {results.uploadSpeed.toFixed(1)} Mbps (Very slow)
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-zinc-400">Browser Storage</span>
          {results.browserStorage === null ? (
            <span className="text-zinc-500">Not tested</span>
          ) : results.browserStorage ? (
            <span className="text-green-500 flex items-center">
              <CheckCircle className="w-4 h-4 mr-1" /> Available
            </span>
          ) : (
            <span className="text-red-500 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" /> Issue detected
            </span>
          )}
        </div>
      </div>

      {Object.values(results).some((result) => result === false) && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
          <p className="font-medium mb-1">Upload issues detected</p>
          <ul className="list-disc list-inside space-y-1">
            {!results.internetConnection && <li>Check your internet connection and try again</li>}
            {!results.vimeoApi && <li>Vimeo API may be experiencing issues or rate limiting</li>}
            {results.uploadSpeed !== null && results.uploadSpeed < 0.5 && (
              <li>Your upload speed is very slow, which may cause timeouts</li>
            )}
            {!results.browserStorage && (
              <li>Your browser may have issues with local storage, try a different browser</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
