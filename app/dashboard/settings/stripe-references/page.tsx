"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function StripeReferencesPage() {
  const [references, setReferences] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchReferences = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/stripe-references")
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`)
      }

      const data = await response.json()
      setReferences(data.references)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReferences()
  }, [])

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-4">Stripe Reference Records</h1>

      <Button onClick={fetchReferences} disabled={loading} className="mb-6">
        {loading ? "Loading..." : "Refresh Data"}
      </Button>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">Error: {error}</div>
      )}

      <div className="grid gap-4">
        {references.length === 0 ? (
          <p>No reference records found.</p>
        ) : (
          references.map((ref) => (
            <Card key={ref.id}>
              <CardHeader>
                <CardTitle>Reference ID: {ref.id}</CardTitle>
                <CardDescription>
                  Created: {ref.createdAt?.toDate ? ref.createdAt.toDate().toISOString() : ref.createdAt}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>
                  <strong>User ID:</strong> {ref.userId}
                </p>
                <p>
                  <strong>Email:</strong> {ref.email}
                </p>
                <p>
                  <strong>Used:</strong> {ref.used ? "Yes" : "No"}
                </p>
                {ref.usedAt && (
                  <p>
                    <strong>Used At:</strong> {ref.usedAt?.toDate ? ref.usedAt.toDate().toISOString() : ref.usedAt}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
