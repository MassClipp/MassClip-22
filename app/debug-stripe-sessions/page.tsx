"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function StripeSessionsDebug() {
  const [email, setEmail] = useState("johnisworthier103@gmail.com")
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (email) params.append("email", email)
      params.append("limit", "20")

      const response = await fetch(`/api/debug/stripe-sessions?${params}`)
      const data = await response.json()
      setSessions(data.sessions || [])
    } catch (error) {
      console.error("Error fetching sessions:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle>Stripe Sessions Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Filter by email"
              className="flex-1"
            />
            <Button onClick={fetchSessions} disabled={loading}>
              {loading ? "Loading..." : "Fetch Sessions"}
            </Button>
          </div>

          <div className="space-y-4">
            {sessions.map((session) => (
              <Card key={session.id} className="border-l-4 border-l-blue-500">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Session ID:</strong> {session.id}
                    </div>
                    <div>
                      <strong>Status:</strong> {session.status}
                    </div>
                    <div>
                      <strong>Email:</strong> {session.customer_email || "N/A"}
                    </div>
                    <div>
                      <strong>Created:</strong> {new Date(session.created).toLocaleString()}
                    </div>
                    <div>
                      <strong>Customer ID:</strong> {session.customer_id || "N/A"}
                    </div>
                    <div>
                      <strong>Subscription ID:</strong> {session.subscription_id || "N/A"}
                    </div>
                    <div className="col-span-2">
                      <strong>Client Reference ID:</strong> {session.client_reference_id || "N/A"}
                    </div>
                    <div className="col-span-2">
                      <strong>Session Metadata:</strong>
                      <pre className="bg-gray-100 p-2 rounded text-xs mt-1">
                        {JSON.stringify(session.metadata, null, 2)}
                      </pre>
                    </div>
                    {session.subscription_metadata && (
                      <div className="col-span-2">
                        <strong>Subscription Metadata:</strong>
                        <pre className="bg-gray-100 p-2 rounded text-xs mt-1">
                          {JSON.stringify(session.subscription_metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {sessions.length === 0 && !loading && <p className="text-center text-gray-500">No sessions found</p>}
        </CardContent>
      </Card>
    </div>
  )
}
