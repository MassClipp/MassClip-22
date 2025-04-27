"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export default function StripeSessionsCheck() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch recent sessions from Stripe
      const response = await fetch("/api/stripe-sessions-check")

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`)
      }

      const data = await response.json()
      setSessions(data.sessions || [])
      setLogs(data.logs || [])
    } catch (err) {
      console.error("Error fetching sessions:", err)
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Recent Stripe Checkout Sessions</h1>
        <Button onClick={fetchData} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Refresh"}
        </Button>
      </div>

      {error && (
        <Card className="mb-6 border-red-300">
          <CardContent className="pt-6">
            <p className="text-red-500">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Recent Checkout Sessions</CardTitle>
          <CardDescription>Last 10 checkout sessions from Stripe</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : sessions.length > 0 ? (
            <div className="space-y-4">
              {sessions.map((session) => (
                <Card key={session.id} className="p-4 bg-gray-50">
                  <div className="grid gap-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Session ID:</span>
                      <span className="font-mono text-sm">{session.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Created:</span>
                      <span>{new Date(session.created * 1000).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Customer:</span>
                      <span>{session.customer_email || session.customer || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Status:</span>
                      <span>{session.status || "N/A"}</span>
                    </div>
                    <div>
                      <span className="font-medium">Metadata:</span>
                      <pre className="mt-1 bg-gray-100 p-2 rounded text-xs overflow-auto">
                        {JSON.stringify(session.metadata || {}, null, 2)}
                      </pre>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center py-4 text-gray-500">No sessions found</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Checkout Logs</CardTitle>
          <CardDescription>Last 10 checkout logs from Firestore</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : logs.length > 0 ? (
            <div className="space-y-4">
              {logs.map((log) => (
                <Card key={log.id} className="p-4 bg-gray-50">
                  <div className="grid gap-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Timestamp:</span>
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">User ID:</span>
                      <span className="font-mono text-sm">{log.userId || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Email:</span>
                      <span>{log.email || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Session ID:</span>
                      <span className="font-mono text-sm">{log.sessionId || "N/A"}</span>
                    </div>
                    <div>
                      <span className="font-medium">Request Metadata:</span>
                      <pre className="mt-1 bg-gray-100 p-2 rounded text-xs overflow-auto">
                        {JSON.stringify(log.requestMetadata || {}, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <span className="font-medium">Session Metadata:</span>
                      <pre className="mt-1 bg-gray-100 p-2 rounded text-xs overflow-auto">
                        {JSON.stringify(log.sessionMetadata || {}, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <span className="font-medium">Customer Metadata:</span>
                      <pre className="mt-1 bg-gray-100 p-2 rounded text-xs overflow-auto">
                        {JSON.stringify(log.customerMetadata || {}, null, 2)}
                      </pre>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center py-4 text-gray-500">No logs found</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
