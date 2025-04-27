"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function StripeVerifyPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/stripe-metadata-verify")
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`)
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-4">Stripe Metadata Verification</h1>

      <Button onClick={fetchData} disabled={loading} className="mb-6">
        {loading ? "Loading..." : "Refresh Data"}
      </Button>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">Error: {error}</div>
      )}

      {data && (
        <>
          <div className="mb-4">
            <p className="text-lg font-semibold">
              Mode:{" "}
              <span className={data.mode === "test" ? "text-blue-600" : "text-green-600"}>
                {data.mode.toUpperCase()}
              </span>
            </p>
          </div>

          <h2 className="text-xl font-bold mb-2">Recent Checkout Sessions</h2>
          {data.sessions.length === 0 ? (
            <p>No recent sessions found.</p>
          ) : (
            <div className="grid gap-4">
              {data.sessions.map((session: any) => (
                <Card key={session.id}>
                  <CardHeader>
                    <CardTitle>Session: {session.id}</CardTitle>
                    <CardDescription>Created: {session.created}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>
                      <strong>Customer Email:</strong> {session.customer_email}
                    </p>

                    <div className="mt-2">
                      <p className="font-semibold">Session Metadata:</p>
                      {session.metadata && Object.keys(session.metadata).length > 0 ? (
                        <pre className="bg-gray-100 p-2 rounded mt-1 text-sm">
                          {JSON.stringify(session.metadata, null, 2)}
                        </pre>
                      ) : (
                        <p className="text-red-500">No metadata found!</p>
                      )}
                    </div>

                    <div className="mt-4">
                      <p className="font-semibold">Subscription:</p>
                      {session.subscription ? (
                        <div>
                          <p>ID: {session.subscription.id}</p>
                          <p>Status: {session.subscription.status}</p>
                          <p className="font-semibold mt-1">Subscription Metadata:</p>
                          {session.subscription.metadata && Object.keys(session.subscription.metadata).length > 0 ? (
                            <pre className="bg-gray-100 p-2 rounded mt-1 text-sm">
                              {JSON.stringify(session.subscription.metadata, null, 2)}
                            </pre>
                          ) : (
                            <p className="text-red-500">No subscription metadata found!</p>
                          )}
                        </div>
                      ) : (
                        <p>No subscription information available</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <h2 className="text-xl font-bold mt-8 mb-2">Recent Checkout Logs</h2>
          {data.logs.length === 0 ? (
            <p>No logs found.</p>
          ) : (
            <div className="grid gap-4">
              {data.logs.map((log: any) => (
                <Card key={log.id}>
                  <CardHeader>
                    <CardTitle>Log: {log.id}</CardTitle>
                    <CardDescription>
                      {log.timestamp?.toDate ? log.timestamp.toDate().toISOString() : log.timestamp}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>
                      <strong>User ID:</strong> {log.userId}
                    </p>
                    <p>
                      <strong>Email:</strong> {log.email}
                    </p>
                    <p>
                      <strong>Session ID:</strong> {log.sessionId}
                    </p>
                    <p>
                      <strong>Mode:</strong> {log.mode || "unknown"}
                    </p>

                    <div className="mt-2">
                      <p className="font-semibold">Session Metadata:</p>
                      {log.sessionMetadata && Object.keys(log.sessionMetadata).length > 0 ? (
                        <pre className="bg-gray-100 p-2 rounded mt-1 text-sm">
                          {JSON.stringify(log.sessionMetadata, null, 2)}
                        </pre>
                      ) : (
                        <p className="text-red-500">No metadata found!</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
