"use client"

import { useState, useEffect } from "react"

export default function CheckConfig() {
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch("/api/check-r2-config")
        const data = await response.json()
        setConfig(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    }

    fetchConfig()
  }, [])

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">R2 Configuration Check</h1>

      {loading && <p>Loading configuration...</p>}

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <h2 className="font-bold">Error:</h2>
          <p>{error}</p>
        </div>
      )}

      {config && (
        <div>
          <h2 className="font-bold mb-2">Cloudflare R2 Configuration:</h2>
          <div className="p-4 bg-gray-100 rounded mb-6">
            <ul>
              <li className={config.cloudflareR2.hasEndpoint ? "text-green-600" : "text-red-600"}>
                Endpoint: {config.cloudflareR2.hasEndpoint ? "✓" : "✗"}
              </li>
              <li className={config.cloudflareR2.hasAccessKeyId ? "text-green-600" : "text-red-600"}>
                Access Key ID: {config.cloudflareR2.hasAccessKeyId ? "✓" : "✗"}
              </li>
              <li className={config.cloudflareR2.hasSecretAccessKey ? "text-green-600" : "text-red-600"}>
                Secret Access Key: {config.cloudflareR2.hasSecretAccessKey ? "✓" : "✗"}
              </li>
              <li className={config.cloudflareR2.hasBucketName ? "text-green-600" : "text-red-600"}>
                Bucket Name: {config.cloudflareR2.hasBucketName ? "✓" : "✗"}
              </li>
              <li className={config.cloudflareR2.hasPublicUrl ? "text-green-600" : "text-red-600"}>
                Public URL: {config.cloudflareR2.hasPublicUrl ? "✓" : "✗"}
                {config.cloudflareR2.publicUrlPrefix && ` (${config.cloudflareR2.publicUrlPrefix})`}
              </li>
            </ul>
          </div>

          <h2 className="font-bold mb-2">Next.js Public Environment Variables:</h2>
          <div className="p-4 bg-gray-100 rounded">
            <ul>
              <li className={config.nextPublic.hasPublicUrl ? "text-green-600" : "text-red-600"}>
                NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL: {config.nextPublic.hasPublicUrl ? "✓" : "✗"}
                {config.nextPublic.publicUrlPrefix && ` (${config.nextPublic.publicUrlPrefix})`}
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
