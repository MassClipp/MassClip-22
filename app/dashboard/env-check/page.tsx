"use client"

import { useState, useEffect } from "react"

export default function EnvCheckPage() {
  const [envStatus, setEnvStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkEnv = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/check-env")
        if (!response.ok) {
          throw new Error(`Failed to check environment: ${response.status}`)
        }
        const data = await response.json()
        setEnvStatus(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    }

    checkEnv()
  }, [])

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Environment Variable Check</h1>

      {loading && <p>Loading environment status...</p>}

      {error && <p className="text-red-500">Error: {error}</p>}

      {envStatus && (
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">Status Summary</h2>
            <p className={`font-bold ${envStatus.allPresent ? "text-green-600" : "text-red-600"}`}>
              {envStatus.allPresent
                ? "✅ All required environment variables are present"
                : "❌ Some required environment variables are missing"}
            </p>
          </div>

          <div className="border rounded overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Variable Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Preview
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(envStatus.envStatus).map(([varName, status]: [string, any]) => (
                  <tr key={varName}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{varName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          status.exists ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {status.exists ? "Present" : "Missing"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {status.exists ? status.preview : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
