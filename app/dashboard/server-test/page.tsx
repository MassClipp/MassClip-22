"use client"

import { useState } from "react"

export default function ServerTest() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runTest = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/test-upload")
      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Server-Side Upload Test</h1>

      <button
        onClick={runTest}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 mb-6"
      >
        {loading ? "Testing..." : "Run Server Test"}
      </button>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <h2 className="font-bold">Error:</h2>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="mb-6">
          <h2 className="font-bold mb-2">Test Result:</h2>
          <div className="p-4 bg-gray-100 rounded overflow-auto">
            <pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
          </div>
        </div>
      )}

      <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded">
        <h2 className="font-bold">Note:</h2>
        <p>
          This test checks if your server can generate presigned URLs for Cloudflare R2 without requiring
          authentication.
        </p>
        <p className="mt-2">
          If this test succeeds but the regular upload still fails, the issue is likely with authentication or session
          handling.
        </p>
      </div>
    </div>
  )
}
