"use client"

import { useEffect } from "react"

export default function CreatorError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Creator Profile Error:", error)
  }, [error])

  return (
    <div className="min-h-screen bg-red-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Creator Profile Error</h1>
        <p className="text-lg mb-4">Could not load creator profile.</p>

        <div className="bg-black p-4 rounded mb-4">
          <h2 className="font-semibold mb-2">Error Details:</h2>
          <pre className="text-xs overflow-auto whitespace-pre-wrap">{error.message}</pre>
          <pre className="text-xs overflow-auto whitespace-pre-wrap mt-2">{error.stack}</pre>
          {error.digest && <p className="text-xs text-gray-400 mt-2">Digest: {error.digest}</p>}
        </div>

        <button onClick={reset} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">
          Try again
        </button>

        <a href="/" className="ml-4 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded inline-block">
          Go Home
        </a>
      </div>
    </div>
  )
}
