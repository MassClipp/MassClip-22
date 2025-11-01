"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function CheckUrlPage() {
  const [urlData, setUrlData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUrlData() {
      try {
        const response = await fetch("/api/check-site-url")
        if (!response.ok) {
          throw new Error("Failed to fetch URL data")
        }
        const data = await response.json()
        setUrlData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    fetchUrlData()
  }, [])

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Site URL Diagnostic</h1>

      {loading && <p>Loading URL data...</p>}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">Error: {error}</div>
      )}

      {urlData && (
        <Card>
          <CardHeader>
            <CardTitle>URL Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">getSiteUrl() returns:</h3>
                <p className="text-green-600 font-mono">{urlData.siteUrl}</p>
              </div>

              <div>
                <h3 className="font-medium">Hardcoded URL:</h3>
                <p className="text-green-600 font-mono">{urlData.hardcodedUrl}</p>
              </div>

              <div>
                <h3 className="font-medium">NEXT_PUBLIC_SITE_URL:</h3>
                <p className={`font-mono ${urlData.envUrl === "not set" ? "text-red-600" : "text-green-600"}`}>
                  {urlData.envUrl}
                </p>
              </div>

              <div>
                <h3 className="font-medium">NEXT_PUBLIC_SITE_URL_2:</h3>
                <p className={`font-mono ${urlData.envUrl2 === "not set" ? "text-red-600" : "text-green-600"}`}>
                  {urlData.envUrl2}
                </p>
              </div>

              <div>
                <h3 className="font-medium">Browser location.origin:</h3>
                <p className="text-green-600 font-mono">
                  {typeof window !== "undefined" ? window.location.origin : "Server rendering"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
